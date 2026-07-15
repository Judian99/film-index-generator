/**
 * OAuth 授权入口
 * 重定向到百度授权页面
 */

import { getAuthUrl } from './lib/baidu-pan.js';

export async function handleAuth(request, env, ctx) {
  const url = new URL(request.url);

  if (!env.BAIDU_CLIENT_ID) {
    return new Response('OAuth configuration error: BAIDU_CLIENT_ID is missing', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  // 生成回调 URL
  const redirectUri = `${url.origin}/callback`;

  // 生成授权 URL
  const authUrl = getAuthUrl(
    env.BAIDU_CLIENT_ID,
    redirectUri,
    Date.now().toString()
  );

  // 重定向到百度授权页面
  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}