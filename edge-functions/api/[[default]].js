/**
 * EdgeOne Makers Edge Function 入口
 *
 * 注意这不是「站点级边缘函数」——那套用 addEventListener('fetch', ...)，
 * Makers 明确不支持，两套接口不能混用。这里的契约是：
 *   - 文件放在 edge-functions/api/ 下，路由由目录结构生成 → 接管 /api/*
 *   - 入口为 export default onRequest(context)
 *   - 环境变量从 context.env 读，不是全局 env
 *
 * 真正的路由分发仍由 workers/src/index.js 负责，本文件只做一层适配，
 * 因此 Cloudflare Workers 与 Makers 共用同一份业务代码。
 *
 * 部署：Makers 项目已关联 Git 仓库，推送即触发构建，无需在控制台粘贴代码。
 */

import worker from '../../workers/src/index.js';

// 与所在目录一致，固定为 /api。回调地址与缩略图地址都靠它生成，
// 写死可以少配一个环境变量、少一个踩坑点。
const API_BASE_PATH = '/api';

export default function onRequest(context) {
  const env = Object.assign({}, context.env, { API_BASE_PATH });
  return worker.fetch(context.request, env, context);
}
