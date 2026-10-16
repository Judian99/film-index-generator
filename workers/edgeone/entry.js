/**
 * EdgeOne 站点边缘函数入口（站点级，不是 EdgeOne Makers/Pages）
 *
 * 运行时是 V8 + Web Service Worker API，入口用 addEventListener('fetch', ...)，
 * 且只允许注册一个 fetch 监听器。控制台配置的环境变量与密钥以全局 env 暴露。
 *
 * 本文件不直接部署，由 `npm run build:edgeone` 打成单文件后粘进控制台
 * （站点级边缘函数不支持多文件 import）。
 */

import worker from '../src/index.js';

// 必须与控制台「边缘函数 → 触发规则」里配的 URL Path 前缀一致
const API_BASE_PATH = '/api';

function resolveRuntimeEnv() {
  const provided = typeof env !== 'undefined' ? env : globalThis.env;
  return Object.assign({}, provided, { API_BASE_PATH });
}

addEventListener('fetch', (event) => {
  event.respondWith(worker.fetch(event.request, resolveRuntimeEnv(), {}));
});
