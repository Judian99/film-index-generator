/**
 * Worker 入口 - 路由分发
 */

import { corsHeaders, jsonResponse, resolveOrigin } from './lib/http.js';
import { handleAuth } from './auth.js';
import { handleCallback } from './callback.js';
import { handleStatus } from './status.js';
import { handleFiles } from './files.js';
import { handleThumbnail } from './thumbnail.js';
import { handleDownload } from './download.js';
import { handleLogout } from './logout.js';

/**
 * 主入口
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = resolveOrigin(env);

    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    try {
      // 路由分发（await 确保异步错误也进入统一 catch）
      switch (path) {
        case '/auth':
          return await handleAuth(request, env, ctx);

        case '/callback':
          return await handleCallback(request, env, ctx);

        case '/status':
          return await handleStatus(request, env, ctx);

        case '/files':
          return await handleFiles(request, env, ctx);

        case '/thumbnail':
          return await handleThumbnail(request, env, ctx);

        case '/download':
          return await handleDownload(request, env, ctx);

        case '/logout':
          return await handleLogout(request, env, ctx);

        default:
          return jsonResponse(origin, 404, { error: 'Not Found' });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse(origin, 500, { error: error.message });
    }
  }
};
