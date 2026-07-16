import { openPayload } from './lib/crypto.js';
import { corsHeaders, errorResponse } from './lib/http.js';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export async function handleThumbnail(request, env) {
  if (request.method !== 'GET') {
    return errorResponse(request, env, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  const url = new URL(request.url);
  const ticket = url.searchParams.get('ticket');
  if (!ticket) {
    return errorResponse(request, env, 400, 'Missing thumbnail ticket', 'INVALID_THUMBNAIL_TICKET');
  }

  let payload;
  try {
    payload = await openPayload(
      ticket,
      'baidu-thumbnail',
      env.TOKEN_ENCRYPTION_KEY
    );
  } catch (error) {
    return errorResponse(request, env, 410, 'Thumbnail ticket expired', 'THUMBNAIL_TICKET_EXPIRED');
  }

  if (
    typeof payload.fsId !== 'string' ||
    !payload.fsId ||
    typeof payload.sourceUrl !== 'string'
  ) {
    return errorResponse(request, env, 400, 'Invalid thumbnail ticket', 'INVALID_THUMBNAIL_TICKET');
  }

  let sourceUrl;
  try {
    sourceUrl = new URL(payload.sourceUrl);
  } catch (error) {
    return errorResponse(request, env, 400, 'Invalid thumbnail ticket', 'INVALID_THUMBNAIL_TICKET');
  }
  if (sourceUrl.protocol !== 'https:') {
    return errorResponse(request, env, 400, 'Invalid thumbnail source', 'INVALID_THUMBNAIL_TICKET');
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
      return errorResponse(request, env, 502, 'Thumbnail unavailable', 'THUMBNAIL_UPSTREAM_FAILED');
    }

    const contentType = (response.headers.get('Content-Type') || '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      console.error('Thumbnail upstream returned unsupported content', { contentType });
      return errorResponse(request, env, 502, 'Unsupported thumbnail response', 'THUMBNAIL_UPSTREAM_FAILED');
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=300',
        ...corsHeaders(request, env)
      }
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return errorResponse(request, env, 502, 'Thumbnail unavailable', 'THUMBNAIL_UPSTREAM_FAILED');
  }
}
