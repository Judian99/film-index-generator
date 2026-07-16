import { decryptToken } from './lib/crypto.js';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

async function getTokenFromCookie(request, encryptionKey) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/bd_token=([^;]+)/);
  if (!match) return null;

  try {
    return JSON.parse(await decryptToken(match[1], encryptionKey));
  } catch (error) {
    return null;
  }
}

function jsonResponse(origin, status, error, code) {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin)
    }
  });
}

export async function handleThumbnail(request, env, ctx) {
  const origin = env.FRONTEND_ORIGIN || 'https://judian99.github.io';
  const url = new URL(request.url);
  const ticket = url.searchParams.get('ticket');

  if (!ticket) {
    return jsonResponse(origin, 400, 'Missing thumbnail ticket', 'INVALID_THUMBNAIL_TICKET');
  }

  const tokenData = await getTokenFromCookie(request, env.TOKEN_ENCRYPTION_KEY);
  if (!tokenData?.access_token) {
    return jsonResponse(origin, 401, 'Not authenticated', 'NOT_AUTHENTICATED');
  }

  let payload;
  try {
    payload = JSON.parse(await decryptToken(ticket, env.TOKEN_ENCRYPTION_KEY));
  } catch (error) {
    return jsonResponse(origin, 400, 'Invalid thumbnail ticket', 'INVALID_THUMBNAIL_TICKET');
  }

  if (
    payload?.version !== 1 ||
    payload?.purpose !== 'baidu-thumbnail' ||
    typeof payload.fsId !== 'string' ||
    !payload.fsId ||
    typeof payload.accountFingerprint !== 'string' ||
    typeof payload.sourceUrl !== 'string' ||
    !Number.isFinite(payload.expiresAt)
  ) {
    return jsonResponse(origin, 400, 'Invalid thumbnail ticket', 'INVALID_THUMBNAIL_TICKET');
  }

  if (payload.expiresAt < Date.now()) {
    return jsonResponse(origin, 410, 'Thumbnail ticket expired', 'THUMBNAIL_TICKET_EXPIRED');
  }

  if (payload.accountFingerprint !== await tokenFingerprint(tokenData.access_token)) {
    return jsonResponse(origin, 403, 'Thumbnail ticket does not belong to this account', 'INVALID_THUMBNAIL_TICKET');
  }

  let sourceUrl;
  try {
    sourceUrl = new URL(payload.sourceUrl);
  } catch (error) {
    return jsonResponse(origin, 400, 'Invalid thumbnail ticket', 'INVALID_THUMBNAIL_TICKET');
  }

  if (sourceUrl.protocol !== 'https:') {
    return jsonResponse(origin, 400, 'Invalid thumbnail source', 'INVALID_THUMBNAIL_TICKET');
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'LogStats'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return jsonResponse(origin, 502, 'Thumbnail unavailable', 'THUMBNAIL_UPSTREAM_FAILED');
    }

    const contentType = (response.headers.get('Content-Type') || '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return jsonResponse(origin, 502, 'Unsupported thumbnail response', 'THUMBNAIL_UPSTREAM_FAILED');
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=300',
        ...corsHeaders(origin)
      }
    });
  } catch (error) {
    return jsonResponse(origin, 502, 'Thumbnail unavailable', 'THUMBNAIL_UPSTREAM_FAILED');
  }
}

async function tokenFingerprint(accessToken) {
  const data = new TextEncoder().encode(accessToken);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true'
  };
}
