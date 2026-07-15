/**
 * OAuth 授权入口
 * 重定向到百度授权页面
 */

import { getAuthUrl } from './lib/baidu-pan.js';

export async function handleAuth(request, env, ctx) {
  const url = new URL(request.url);
  const origin = env.FRONTEND_URL || '*';

  // 生成回调 URL
  const redirectUri = `${url.origin}/callback`;

  // 生成授权 URL
  const authUrl = getAuthUrl(
    env.BAIDU_CLIENT_ID,
    redirectUri,
    Date.now().toString()
  );

  return Response.redirect(authUrl, 302);
}