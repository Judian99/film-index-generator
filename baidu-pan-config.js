/**
 * 百度网盘配置
 *
 * 迁移到 EdgeOne 边缘函数后，前端与 API 同域，把 BAIDU_PAN_API_OVERRIDE 置为空字符串，
 * 就会自动走当前域名的 /api 前缀（部署步骤见 workers/README.md）。
 * 回退到 Cloudflare Workers 时，把下面的地址填回来即可。
 */

// 留空 = 同域部署（EdgeOne 站点边缘函数）
var BAIDU_PAN_API_OVERRIDE = 'https://film-index-baidu-pan.1946378724.workers.dev';

var BAIDU_PAN_API = BAIDU_PAN_API_OVERRIDE || (
  /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:8787'
    : location.origin + '/api'
);
