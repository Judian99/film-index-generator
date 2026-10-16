/**
 * OAuth 回调处理
 * 接收百度授权码，换取 token，存入加密 Cookie
 */

import { exchangeToken } from './lib/baidu-pan.js';
import { encryptToken } from './lib/crypto.js';
import { authCookieHeader, resolveOrigin, withBasePath } from './lib/http.js';

export async function handleCallback(request, env, ctx) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectUri = `${url.origin}${withBasePath(env, '/callback')}`;

  if (!code) {
    return new Response('Authorization failed: no code received', { status: 400 });
  }

  try {
    // 用 code 换取 token
    const tokenData = await exchangeToken(
      code,
      env.BAIDU_CLIENT_ID,
      env.BAIDU_CLIENT_SECRET,
      redirectUri
    );

    // 将 access_token 和 refresh_token 序列化为 JSON
    const tokenPayload = JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      expires_in: tokenData.expires_in || 2592000,
      scope: tokenData.scope || ''
    });

    // 加密 token
    const encryptedToken = await encryptToken(
      tokenPayload,
      env.TOKEN_ENCRYPTION_KEY
    );

    // 重定向回前端，携带加密的 token
    // 未配置时回落到前端来源域名，省掉一个必须手配的环境变量
    const frontendUrl = env.FRONTEND_URL || `${resolveOrigin(env)}/`;

    // 使用 new Response 构造重定向，以便设置自定义头
    return new Response(null, {
      status: 302,
      headers: {
        'Location': frontendUrl,
        'Set-Cookie': authCookieHeader(encryptedToken, env, tokenData.expires_in || 2592000)
      }
    });

  } catch (error) {
    console.error('Callback error:', error);
    return new Response(`Authentication failed: ${error.message}`, { status: 500 });
  }
}