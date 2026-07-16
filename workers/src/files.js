import { listFiles, listImages } from './lib/baidu-pan.js';
import { sealPayload } from './lib/crypto.js';
import { requireSession } from './lib/auth-session.js';
import { corsHeaders, errorResponse } from './lib/http.js';

const DIRECTORY_BATCH_SIZE = 1000;
const MAX_DIRECTORY_PAGES = 20;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export async function handleFiles(request, env, ctx) {
  if (request.method !== 'GET') {
    return errorResponse(request, env, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }
  const url = new URL(request.url);
  const path = normalizePath(url.searchParams.get('path'));

  const auth = await requireSession(request, env);
  if (auth.error) {
    return errorResponse(request, env, 401, 'Not authenticated', auth.error);
  }
  const accessToken = auth.accessToken;

  let directoryFiles;
  let imageList;
  try {
    [directoryFiles, imageList] = await Promise.all([
      collectDirectoryFiles(accessToken, path),
      listImages(accessToken, path)
    ]);
  } catch (error) {
    console.error('Baidu files upstream failed', {
      operation: error.operation || 'unknown',
      path,
      status: error.status,
      errno: error.errno
    });
    return upstreamErrorResponse(request, env, error);
  }

  try {
    const directories = directoryFiles
      .filter(file => Number(file.isdir ?? file.is_dir) === 1)
      .map(file => normalizeDirectory(file));
    const images = await Promise.all((imageList.info || [])
      .filter(file => Number(file.isdir ?? file.is_dir) !== 1)
      .map(file => normalizeImage(file, request.url, env.TOKEN_ENCRYPTION_KEY)));
    const files = mergeFiles(directories, images.filter(Boolean));

    return new Response(JSON.stringify({
      path,
      total: files.length,
      files
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...corsHeaders(request, env)
      }
    });
  } catch (error) {
    console.error('Files response generation failed', { path });
    return errorResponse(request, env, 500, 'Unable to prepare file list', 'FILES_RESPONSE_FAILED');
  }
}

async function collectDirectoryFiles(accessToken, path) {
  const files = [];
  const pageSignatures = new Set();

  for (let page = 1; page <= MAX_DIRECTORY_PAGES; page += 1) {
    const result = await listFiles(
      accessToken,
      path,
      page,
      DIRECTORY_BATCH_SIZE,
      'name',
      0
    );
    const pageFiles = Array.isArray(result.list) ? result.list : [];
    if (pageFiles.length === 0) return files;

    const signature = pageFiles
      .map(file => String(file.fs_id ?? file.path ?? ''))
      .join('|');
    if (pageSignatures.has(signature)) {
      const error = new Error('Baidu list pagination made no progress');
      error.operation = 'list';
      error.path = path;
      error.code = 'BAIDU_PAGINATION_FAILED';
      throw error;
    }
    pageSignatures.add(signature);
    files.push(...pageFiles);

    const total = Number(result.total_num);
    if (
      pageFiles.length < DIRECTORY_BATCH_SIZE ||
      (Number.isFinite(total) && files.length >= total)
    ) {
      return files;
    }
  }

  const error = new Error('Baidu directory exceeds pagination limit');
  error.operation = 'list';
  error.path = path;
  error.code = 'BAIDU_DIRECTORY_TOO_LARGE';
  throw error;
}

function normalizeDirectory(file) {
  return {
    fs_id: file.fs_id,
    path: file.path,
    filename: fileName(file),
    is_dir: true,
    size: file.size,
    server_mtime: file.server_mtime,
    is_image: false,
    thumbnail_url: null
  };
}

async function normalizeImage(file, requestUrl, encryptionKey) {
  const filename = fileName(file);
  if (!IMAGE_EXTENSIONS.some(extension => filename.toLowerCase().endsWith(extension))) {
    return null;
  }

  const sourceUrl = normalizeThumbnailSource(
    file.thumbs?.url2 || file.thumbs?.url1 || file.thumbs?.url3 || file.thumbs?.icon
  );
  let thumbnailUrl = null;

  if (sourceUrl) {
    const now = Date.now();
    const ticket = await sealPayload({
      issuedAt: now,
      expiresAt: now + 10 * 60 * 1000,
      fsId: String(file.fs_id),
      sourceUrl
    }, 'baidu-thumbnail', encryptionKey);
    const proxyUrl = new URL('/thumbnail', requestUrl);
    proxyUrl.searchParams.set('ticket', ticket);
    thumbnailUrl = proxyUrl.toString();
  }

  return {
    fs_id: file.fs_id,
    path: file.path,
    filename,
    is_dir: false,
    size: file.size,
    server_mtime: file.server_mtime,
    is_image: true,
    thumbnail_url: thumbnailUrl
  };
}

function mergeFiles(directories, images) {
  const merged = [];
  const keys = new Set();

  [...directories, ...images].forEach(file => {
    const key = file.fs_id !== undefined && file.fs_id !== null
      ? `id:${String(file.fs_id)}`
      : `path:${normalizePath(file.path)}`;
    if (keys.has(key)) return;
    keys.add(key);
    merged.push(file);
  });

  return merged;
}

function fileName(file) {
  return file.server_filename || file.filename || file.path?.split('/').pop() || '';
}

function normalizeThumbnailSource(rawSourceUrl) {
  if (typeof rawSourceUrl !== 'string' || !rawSourceUrl) return null;

  try {
    const sourceUrl = new URL(rawSourceUrl);
    if (sourceUrl.protocol === 'http:') sourceUrl.protocol = 'https:';
    return sourceUrl.protocol === 'https:' ? sourceUrl.toString() : null;
  } catch (error) {
    return null;
  }
}

function normalizePath(path) {
  const parts = String(path || '/').split('/').filter(Boolean);
  return parts.length ? `/${parts.join('/')}` : '/';
}

function upstreamErrorResponse(request, env, error) {
  if (error.errno === -6 || error.errno === 31045) {
    return errorResponse(request, env, 401, 'Baidu authorization expired', 'BAIDU_AUTH_EXPIRED');
  }
  if (error.errno === 20013) {
    return errorResponse(request, env, 403, 'Baidu API permission denied', 'BAIDU_PERMISSION_DENIED');
  }
  if (error.code === 'BAIDU_DIRECTORY_TOO_LARGE') {
    return errorResponse(request, env, 502, 'Directory contains too many entries', error.code);
  }
  return errorResponse(request, env, 502, 'Unable to read Baidu file list', 'BAIDU_FILES_UPSTREAM_FAILED');
}
