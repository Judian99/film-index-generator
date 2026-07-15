/**
 * 文件列表代理
 * 返回指定目录下的文件列表
 */

import { listFiles } from './lib/baidu-pan.js';
import { decryptToken } from './lib/crypto.js';

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

    // 过滤出图片文件（常见格式）
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.raw', '.tiff', '.tif'];
    const imageFiles = (fileList.list || []).map(file => {
      const filename = file.server_filename || file.filename || file.path?.split('/').pop() || '';
      const isImage = imageExtensions.some(ext =>
        filename.toLowerCase().endsWith(ext)
      );

      return {
        fs_id: file.fs_id,
        path: file.path,
        filename,
        is_dir: file.is_dir === 1,
        size: file.size,
        server_mtime: file.server_mtime,
        is_image: isImage
      };
    });

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

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true'
  };
}