/**
 * Worker 入口 - 路由分发
 */

import { handleAuth } from './auth.js';
import { handleAuthExchange } from './auth-exchange.js';
import { handleCallback } from './callback.js';
import { handleStatus } from './status.js';
import { handleFiles } from './files.js';
import { handleThumbnail } from './thumbnail.js';
import { handleDownload } from './download.js';
import { handleLogout } from './logout.js';

/**
 * 生成 CORS 响应头
 */
function corsHeaders(request, origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin'
  };
  if (request.headers.get('Origin') === origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/**
 * 主入口
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = env.FRONTEND_ORIGIN || 'https://judian99.github.io';

    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, origin)
      });
    }

    try {
      // 路由分发
      switch (path) {
        case '/auth':
          return handleAuth(request, env, ctx);

        case '/auth/exchange':
          return handleAuthExchange(request, env, ctx);

        case '/callback':
          return handleCallback(request, env, ctx);

        case '/status':
          return handleStatus(request, env, ctx);

        case '/files':
          return handleFiles(request, env, ctx);

        case '/thumbnail':
          return handleThumbnail(request, env, ctx);

        case '/download':
          return handleDownload(request, env, ctx);

        case '/logout':
          return handleLogout(request, env, ctx);

        default:
          return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders(request, origin)
            }
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(request, origin)
        }
      });
    }
  }
};