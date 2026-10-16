/**
 * EdgeOne Makers 适配器契约测试
 *
 * 这层适配最容易出错的地方是「用错产品」：Makers 的入口是
 * `export default onRequest(context)`，而站点级边缘函数是
 * `addEventListener('fetch', ...)`，两者不兼容，且用错时表现为一个普通 404，
 * 排查成本很高。所以这里把契约钉住。
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import onRequest from '../../edge-functions/api/[[default]].js';

test('adapter exports an onRequest function, not a fetch listener', () => {
  assert.equal(typeof onRequest, 'function');
});

test('adapter routes /api/* and generates prefixed public URLs', async () => {
  const call = (path, { method = 'GET', env = {} } = {}) => onRequest({
    request: new Request(`https://www.filmindex.site${path}`, { method }),
    env,
    params: {},
    waitUntil() {}
  });

  // 无 token 时 /status 不触发上游请求，可作部署探针
  const status = await call('/api/status');
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { logged_in: false, user: null });

  // 回调地址必须带 /api 前缀，且需与百度登记的地址逐字一致
  const auth = await call('/api/auth', { env: { BAIDU_CLIENT_ID: 'client-id' } });
  assert.equal(auth.status, 302);
  assert.equal(
    new URL(auth.headers.get('Location')).searchParams.get('redirect_uri'),
    'https://www.filmindex.site/api/callback'
  );

  assert.equal((await call('/api/nope')).status, 404);
  assert.equal((await call('/api/status', { method: 'OPTIONS' })).status, 204);
});

test('adapter defaults CORS to the production origin without any env', async () => {
  const response = await onRequest({
    request: new Request('https://www.filmindex.site/api/status'),
    env: {},
    params: {},
    waitUntil() {}
  });

  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://www.filmindex.site'
  );
});
