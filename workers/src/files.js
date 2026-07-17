import { listFiles, listImages } from './lib/baidu-pan.js';
import { decryptToken, encryptToken } from './lib/crypto.js';

const DIRECTORY_BATCH_SIZE = 1000;
const MAX_DIRECTORY_PAGES = 20;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

async function getTokenFromCookie(request, encryptionKey) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/bd_token=([^;]+)/);
  if (!match) return null;

  try {
    return JSON.parse(await decryptToken(match[1], encryptionKey));
  } catch (error) {
    console.error('Token decryption failed');
    return null;
  }
}

export async function handleFiles(request, env, ctx) {
  const origin = env.FRONTEND_ORIGIN || 'https://judian99.github.io';
  const url = new URL(request.url);
  const path = normalizePath(url.searchParams.get('path'));

  const tokenData = await getTokenFromCookie(request, env.TOKEN_ENCRYPTION_KEY);
  if (!tokenData?.access_token) {
    return jsonResponse(origin, 401, 'Not authenticated', 'NOT_AUTHENTICATED');
  }

  let directoryFiles;
  let imageList;
  try {
    [directoryFiles, imageList] = await Promise.all([
      collectDirectoryFiles(tokenData.access_token, path),
      listImages(tokenData.access_token, path)
    ]);
  } catch (error) {
    console.error('Baidu files upstream failed', {
      operation: error.operation || 'unknown',
      path,
      status: error.status,
      errno: error.errno
    });
    return upstreamErrorResponse(origin, error);
  }

  try {
    const accountFingerprint = await tokenFingerprint(tokenData.access_token);
    const directories = directoryFiles
      .filter(file => Number(file.isdir ?? file.is_dir) === 1)
      .map(file => normalizeDirectory(file));
    const images = await Promise.all((imageList.info || [])
      .filter(file => Number(file.isdir ?? file.is_dir) !== 1)
      .map(file => normalizeImage(file, request.url, accountFingerprint, env.TOKEN_ENCRYPTION_KEY)));
    const files = mergeFiles(directories, images.filter(Boolean));

    return new Response(JSON.stringify({
      path,
      total: files.length,
      files
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    });
  } catch (error) {
    console.error('Files response generation failed', { path });
    return jsonResponse(origin, 500, 'Unable to prepare file list', 'FILES_RESPONSE_FAILED');
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

async function normalizeImage(file, requestUrl, accountFingerprint, encryptionKey) {
  const filename = fileName(file);
  if (!IMAGE_EXTENSIONS.some(extension => filename.toLowerCase().endsWith(extension))) {
    return null;
  }

  const sourceUrl = normalizeThumbnailSource(
    file.thumbs?.url2 || file.thumbs?.url1 || file.thumbs?.url3 || file.thumbs?.icon
  );
  let thumbnailUrl = null;

  if (sourceUrl) {
    const ticket = await encryptToken(JSON.stringify({
      version: 1,
      purpose: 'baidu-thumbnail',
      fsId: String(file.fs_id),
      accountFingerprint,
      sourceUrl,
      expiresAt: Date.now() + 60 * 60 * 1000
    }), encryptionKey);
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

function upstreamErrorResponse(origin, error) {
  if (error.errno === -6 || error.errno === 31045) {
    return jsonResponse(origin, 401, 'Baidu authorization expired', 'BAIDU_AUTH_EXPIRED');
  }
  if (error.errno === 20013) {
    return jsonResponse(origin, 403, 'Baidu API permission denied', 'BAIDU_PERMISSION_DENIED');
  }
  if (error.code === 'BAIDU_DIRECTORY_TOO_LARGE') {
    return jsonResponse(origin, 502, 'Directory contains too many entries', error.code);
  }
  return jsonResponse(origin, 502, 'Unable to read Baidu file list', 'BAIDU_FILES_UPSTREAM_FAILED');
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
