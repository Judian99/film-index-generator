/**
 * 文件列表代理
 * 返回指定目录下的文件列表
 */

import { listFiles } from './lib/baidu-pan.js';
import { decryptToken, encryptToken } from './lib/crypto.js';

/**
 * 从 Cookie 中提取并解密 token
 */
async function getTokenFromCookie(request, encryptionKey) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/bd_token=([^;]+)/);

  if (!match) {
    return null;
  }

  try {
    const encryptedToken = match[1];
    const decryptedPayload = await decryptToken(encryptedToken, encryptionKey);
    const tokenData = JSON.parse(decryptedPayload);
    return tokenData;
  } catch (error) {
    console.error('Token decryption failed:', error);
    return null;
  }
}

export async function handleFiles(request, env, ctx) {
  const origin = env.FRONTEND_ORIGIN || 'https://judian99.github.io';
  const url = new URL(request.url);

  // 获取查询参数
  const path = url.searchParams.get('path') || '/';
  const page = parseInt(url.searchParams.get('page') || '1');
  const num = parseInt(url.searchParams.get('num') || '100');

  try {
    // 获取 token
    const tokenData = await getTokenFromCookie(request, env.TOKEN_ENCRYPTION_KEY);

    if (!tokenData || !tokenData.access_token) {
      return new Response(JSON.stringify({
        error: 'Not authenticated'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      });
    }

    // 获取文件列表
    const fileList = await listFiles(
      tokenData.access_token,
      path,
      page,
      num,
      'name',
      0
    );

    // 与浏览器实际支持的格式保持一致
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const accountFingerprint = await tokenFingerprint(tokenData.access_token);
    const imageFiles = await Promise.all((fileList.list || []).map(async file => {
      const filename = file.server_filename || file.filename || file.path?.split('/').pop() || '';
      const isDir = Number(file.isdir ?? file.is_dir) === 1;
      const isImage = !isDir && imageExtensions.some(ext =>
        filename.toLowerCase().endsWith(ext)
      );
      const rawSourceUrl = isImage
        ? file.thumbs?.url2 || file.thumbs?.url1 || file.thumbs?.url3 || null
        : null;
      const sourceUrl = rawSourceUrl?.replace(/^http:\/\//i, 'https://') || null;
      let thumbnailUrl = null;

      if (sourceUrl) {
        const ticket = await encryptToken(JSON.stringify({
          version: 1,
          purpose: 'baidu-thumbnail',
          fsId: String(file.fs_id),
          accountFingerprint,
          sourceUrl,
          expiresAt: Date.now() + 60 * 60 * 1000
        }), env.TOKEN_ENCRYPTION_KEY);
        const proxyUrl = new URL('/thumbnail', request.url);
        proxyUrl.searchParams.set('ticket', ticket);
        thumbnailUrl = proxyUrl.toString();
      }

      return {
        fs_id: file.fs_id,
        path: file.path,
        filename,
        is_dir: isDir,
        size: file.size,
        server_mtime: file.server_mtime,
        is_image: isImage,
        thumbnail_url: thumbnailUrl
      };
    }));

    return new Response(JSON.stringify({
      path: path,
      page: page,
      num: num,
      total: fileList.total_num || imageFiles.length,
      files: imageFiles
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    });

  } catch (error) {
    console.error('Files list error:', error);

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    });
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