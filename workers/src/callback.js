/**
 * OAuth 回调处理
 * 接收百度授权码，换取 token，存入加密 Cookie
 */

import { exchangeToken } from './lib/baidu-pan.js';
import { encryptToken } from './lib/crypto.js';

export async function handleCallback(request, env, ctx) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectUri = `${url.origin}/callback`;

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
    const frontendUrl = env.FRONTEND_URL || '/';

    // 使用 new Response 构造重定向，以便设置自定义头
    const cookieParts = [
      `bd_token=${encryptedToken}`,
      'HttpOnly',
      'Secure',
      'SameSite=None',
      `Max-Age=${tokenData.expires_in || 2592000}`,
      'Path=/'
    ];

    return new Response(null, {
      status: 302,
      headers: {
        'Location': frontendUrl,
        'Set-Cookie': cookieParts.join('; ')
      }
    });

  } catch (error) {
    console.error('Callback error:', error);
    return new Response(`Authentication failed: ${error.message}`, { status: 500 });
  }
}