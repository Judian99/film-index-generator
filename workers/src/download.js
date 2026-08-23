/**
 * 文件下载代理
 * 流式传输文件到浏览器
 */

import { getDownloadUrl, buildDownloadUrl } from './lib/baidu-pan.js';
import { corsHeaders, getTokenFromCookie, jsonResponse, resolveOrigin } from './lib/http.js';

export async function handleDownload(request, env, ctx) {
  const origin = resolveOrigin(env);
  const url = new URL(request.url);
  const fsId = url.searchParams.get('fs_id');

  if (!fsId) {
    return jsonResponse(origin, 400, {
      error: 'Missing fs_id parameter'
    });
  }

  try {
    // 获取 token
    const tokenData = await getTokenFromCookie(request, env.TOKEN_ENCRYPTION_KEY);

    if (!tokenData || !tokenData.access_token) {
      return jsonResponse(origin, 401, {
        error: 'Not authenticated'
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
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      ...corsHeaders(origin)
    });

    return new Response(response.body, { headers });

  } catch (error) {
    console.error('Download error:', error);

    return jsonResponse(origin, 500, {
      error: error.message
    });
  }
}
