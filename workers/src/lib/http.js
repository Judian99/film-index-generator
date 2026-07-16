export function corsHeaders(request, env, methods = 'GET, POST, OPTIONS') {
  const origin = request.headers.get('Origin');
  const allowedOrigin = env.FRONTEND_ORIGIN || 'https://judian99.github.io';
  const headers = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin'
  };
  if (origin === allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }
  return headers;
}

export function jsonResponse(request, env, status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
      ...extraHeaders
    }
  });
}

export function errorResponse(request, env, status, error, code) {
  return jsonResponse(request, env, status, { error, code });
}

export function optionsResponse(request, env) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env)
  });
}

export function originAllowed(request, env) {
  const origin = request.headers.get('Origin');
  return origin === (env.FRONTEND_ORIGIN || 'https://judian99.github.io');
}

export function methodNotAllowed(request, env, allowed) {
  return errorResponse(request, env, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
}
