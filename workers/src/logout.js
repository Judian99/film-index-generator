/**
 * 登出处理
 * 清除加密 Cookie
 */

export async function handleLogout(request, env, ctx) {
  const origin = env.FRONTEND_ORIGIN || 'https://judian99.github.io';

  const response = new Response(JSON.stringify({
    logged_out: true
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Set-Cookie': 'bd_token=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/'
    }
  });

  return response;
}