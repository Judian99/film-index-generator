import { decryptToken } from './lib/crypto.js';
import { corsHeaders, getTokenFromCookie, jsonResponse, resolveOrigin, tokenFingerprint } from './lib/http.js';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export async function handleThumbnail(request, env, ctx) {
  const origin = resolveOrigin(env);
  const url = new URL(request.url);
  const ticket = url.searchParams.get('ticket');

  if (!ticket) {
    return jsonResponse(origin, 400, { error: 'Missing thumbnail ticket', code: 'INVALID_THUMBNAIL_TICKET' });
  }

  const tokenData = await getTokenFromCookie(request, env.TOKEN_ENCRYPTION_KEY);
  if (!tokenData?.access_token) {
    return jsonResponse(origin, 401, { error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
  }

  let payload;
  try {
    payload = JSON.parse(await decryptToken(ticket, env.TOKEN_ENCRYPTION_KEY));
  } catch (error) {
    return jsonResponse(origin, 400, { error: 'Invalid thumbnail ticket', code: 'INVALID_THUMBNAIL_TICKET' });
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
    return jsonResponse(origin, 400, { error: 'Invalid thumbnail ticket', code: 'INVALID_THUMBNAIL_TICKET' });
  }

  if (payload.expiresAt < Date.now()) {
    return jsonResponse(origin, 410, { error: 'Thumbnail ticket expired', code: 'THUMBNAIL_TICKET_EXPIRED' });
  }

  if (payload.accountFingerprint !== await tokenFingerprint(tokenData.access_token)) {
    return jsonResponse(origin, 403, { error: 'Thumbnail ticket does not belong to this account', code: 'INVALID_THUMBNAIL_TICKET' });
  }

  let sourceUrl;
  try {
    sourceUrl = new URL(payload.sourceUrl);
  } catch (error) {
    return jsonResponse(origin, 400, { error: 'Invalid thumbnail ticket', code: 'INVALID_THUMBNAIL_TICKET' });
  }

  if (sourceUrl.protocol !== 'https:') {
    return jsonResponse(origin, 400, { error: 'Invalid thumbnail source', code: 'INVALID_THUMBNAIL_TICKET' });
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'Accept': 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
        'User-Agent': 'LogStats'
      },
      redirect: 'follow',
      signal: request.signal
    });

    if (!response.ok) {
      console.error('Thumbnail upstream failed', { status: response.status });
      return jsonResponse(origin, 502, { error: 'Thumbnail unavailable', code: 'THUMBNAIL_UPSTREAM_FAILED' });
    }

    const contentType = (response.headers.get('Content-Type') || '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      console.error('Thumbnail upstream returned unsupported content', { contentType });
      return jsonResponse(origin, 502, { error: 'Unsupported thumbnail response', code: 'THUMBNAIL_UPSTREAM_FAILED' });
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
    return jsonResponse(origin, 502, { error: 'Thumbnail unavailable', code: 'THUMBNAIL_UPSTREAM_FAILED' });
  }
}
