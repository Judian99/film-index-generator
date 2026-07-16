import { jsonResponse, originAllowed } from './lib/http.js';

export async function handleLogout(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse(request, env, 405, {
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }
  if (!originAllowed(request, env)) {
    return jsonResponse(request, env, 403, {
      error: 'Origin not allowed',
      code: 'ORIGIN_NOT_ALLOWED'
    });
  }
  return jsonResponse(request, env, 200, { logged_out: true });
}
