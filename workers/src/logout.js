/**
 * 登出处理
 * 清除加密 Cookie
 */

import { jsonResponse, resolveOrigin } from './lib/http.js';

export async function handleLogout(request, env, ctx) {
  const origin = resolveOrigin(env);

  return jsonResponse(origin, 200, { logged_out: true }, {
    'Set-Cookie': 'bd_token=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/'
  });
}