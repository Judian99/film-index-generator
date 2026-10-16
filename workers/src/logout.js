/**
 * 登出处理
 * 清除加密 Cookie
 */

import { authCookieHeader, jsonResponse, resolveOrigin } from './lib/http.js';

export async function handleLogout(request, env, ctx) {
  const origin = resolveOrigin(env);

  return jsonResponse(origin, 200, { logged_out: true }, {
    'Set-Cookie': authCookieHeader('', env, 0)
  });
}