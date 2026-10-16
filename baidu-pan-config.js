/**
 * 百度网盘配置
 *
 * 前端与 API 同域：后端跑在 EdgeOne Makers 的 edge-functions/api/ 下，
 * 走当前域名的 /api 前缀（部署说明见 workers/README.md）。
 * 只有回退到 Cloudflare Workers 时才需要填 BAIDU_PAN_API_OVERRIDE。
 */

// 留空 = 同域部署（EdgeOne Makers）
var BAIDU_PAN_API_OVERRIDE = '';

var BAIDU_PAN_API = BAIDU_PAN_API_OVERRIDE || (
  /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:8787'
    : location.origin + '/api'
);
