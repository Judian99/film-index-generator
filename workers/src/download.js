import { getDownloadUrl, buildDownloadUrl } from './lib/baidu-pan.js';
import { requireSession } from './lib/auth-session.js';
import { corsHeaders, errorResponse } from './lib/http.js';

const DEFAULT_MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/octet-stream'
]);

export async function handleDownload(request, env) {
  if (request.method !== 'GET') {
    return errorResponse(request, env, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  const url = new URL(request.url);
  const fsId = url.searchParams.get('fs_id');
  if (!fsId || !/^\d+$/.test(fsId)) {
    return errorResponse(request, env, 400, 'Invalid fs_id parameter', 'INVALID_FILE_ID');
  }

  const auth = await requireSession(request, env);
  if (auth.error) {
    return errorResponse(request, env, 401, 'Not authenticated', auth.error);
  }

  try {
    const metadata = await getDownloadUrl(auth.accessToken, fsId);
    const maxBytes = positiveInteger(env.MAX_DOWNLOAD_BYTES, DEFAULT_MAX_DOWNLOAD_BYTES);
    if (!Number.isFinite(metadata.size) || metadata.size < 0) {
      return errorResponse(request, env, 502, 'Unable to verify file size', 'INVALID_FILE_METADATA');
    }
    if (metadata.size > maxBytes) {
      return errorResponse(request, env, 413, 'File exceeds download limit', 'FILE_TOO_LARGE');
    }

    const downloadUrl = buildDownloadUrl(metadata.dlink, auth.accessToken);
    const response = await fetch(downloadUrl, {
      headers: { 'User-Agent': 'LogStats' },
      signal: request.signal
    });
    if (!response.ok) {
      console.error('Baidu download upstream failed', { status: response.status });
      const status = response.status === 429 ? 429 : 502;
      const code = response.status === 429 ? 'DOWNLOAD_RATE_LIMITED' : 'DOWNLOAD_UPSTREAM_FAILED';
      return errorResponse(request, env, status, 'Original image unavailable', code);
    }

    const contentLengthHeader = response.headers.get('Content-Length');
    const contentLength = contentLengthHeader === null ? null : Number(contentLengthHeader);
    if (contentLength !== null && (!Number.isFinite(contentLength) || contentLength < 0)) {
      return errorResponse(request, env, 502, 'Invalid original image metadata', 'DOWNLOAD_UPSTREAM_FAILED');
    }
    if (contentLength !== null && contentLength > maxBytes) {
      return errorResponse(request, env, 413, 'File exceeds download limit', 'FILE_TOO_LARGE');
    }
    const contentType = (response.headers.get('Content-Type') || 'application/octet-stream')
      .split(';', 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return errorResponse(request, env, 502, 'Unsupported original image response', 'DOWNLOAD_UPSTREAM_FAILED');
    }

    const headers = {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      ...corsHeaders(request, env)
    };
    if (Number.isFinite(contentLength) && contentLength >= 0) {
      headers['Content-Length'] = String(contentLength);
    }
    return new Response(response.body, { headers });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('Baidu download failed');
    return errorResponse(request, env, 502, 'Original image unavailable', 'DOWNLOAD_UPSTREAM_FAILED');
  }
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
