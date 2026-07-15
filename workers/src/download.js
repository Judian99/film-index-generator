/**
 * 文件下载代理
 * 流式传输文件到浏览器
 */

import { getDownloadUrl, buildDownloadUrl } from './lib/baidu-pan.js';
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

export async function handleDownload(request, env, ctx) {
  const origin = env.FRONTEND_URL || '*';
  const url = new URL(request.url);
  const fsId = url.searchParams.get('fs_id');

  if (!fsId) {
    return new Response(JSON.stringify({
      error: 'Missing fs_id parameter'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    });
  }

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

    // 获取下载链接
    const dlink = await getDownloadUrl(tokenData.access_token, fsId);
    const downloadUrl = buildDownloadUrl(dlink, tokenData.access_token);

    // 流式代理下载（不落地存储）
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'LogStats'
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    // 流式传输到浏览器
    const headers = new Headers({
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true'
    });

    return new Response(response.body, { headers });

  } catch (error) {
    console.error('Download error:', error);

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