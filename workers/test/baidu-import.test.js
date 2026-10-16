import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../src/index.js';
import { decryptToken, encryptToken } from '../src/lib/crypto.js';

const ENV = {
  FRONTEND_ORIGIN: 'https://judian99.github.io',
  TOKEN_ENCRYPTION_KEY: '12345678901234567890123456789012'
};
const PNG_BYTES = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

async function authCookie(accessToken = 'token-a') {
  const encrypted = await encryptToken(JSON.stringify({ access_token: accessToken }), ENV.TOKEN_ENCRYPTION_KEY);
  return `bd_token=${encrypted}`;
}

async function workerRequest(path, cookie, env = ENV) {
  return worker.fetch(new Request(`https://worker.test${path}`, {
    headers: cookie ? { Cookie: cookie } : {}
  }), env, {});
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function requestUrl(input) {
  if (input instanceof URL) return new URL(input.toString());
  if (typeof input === 'string') return new URL(input);
  return new URL(input.url);
}

function imageRecord(id, overrides = {}) {
  return {
    fs_id: id,
    isdir: 0,
    path: `/Album/photo-${id}.jpg`,
    server_filename: `photo-${id}.jpg`,
    size: 100,
    server_mtime: 1700000000 + Number(id),
    thumbs: {
      icon: `https://thumb.test/${id}?size=icon`,
      url1: `https://thumb.test/${id}?size=small`,
      url2: `http://thumb.test/${id}?size=medium&sign=signed`,
      url3: `https://thumb.test/${id}?size=large`
    },
    ...overrides
  };
}

test('files merges generic directories with imagelist thumbnails', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = requestUrl(input);
    calls.push(url);
    if (url.searchParams.get('method') === 'list') {
      return jsonResponse({
        errno: 0,
        total_num: 2,
        list: [
          { fs_id: 1, isdir: 1, path: '/Album/Sub', server_filename: 'Sub' },
          imageRecord(99, { thumbs: { url2: 'https://wrong.test/generic' } })
        ]
      });
    }
    if (url.searchParams.get('method') === 'imagelist') {
      return jsonResponse({ errno: 0, info: [imageRecord(2)] });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const response = await workerRequest('/files?path=/Album&page=1&num=1', await authCookie());
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.path, '/Album');
    assert.equal(data.total, 2);
    assert.deepEqual(data.files.map(file => [file.fs_id, file.is_dir]), [[1, true], [2, false]]);

    const listCall = calls.find(url => url.searchParams.get('method') === 'list');
    const imageCall = calls.find(url => url.searchParams.get('method') === 'imagelist');
    assert.equal(listCall.searchParams.get('dir'), '/Album');
    assert.equal(listCall.searchParams.get('num'), '1000');
    assert.equal(listCall.searchParams.has('web'), false);
    assert.equal(imageCall.searchParams.get('parent_path'), '/Album');
    assert.equal(imageCall.searchParams.get('web'), '1');
    assert.equal(imageCall.searchParams.has('page'), false);

    const ticket = new URL(data.files[1].thumbnail_url).searchParams.get('ticket');
    const payload = JSON.parse(await decryptToken(ticket, ENV.TOKEN_ENCRYPTION_KEY));
    assert.equal(payload.sourceUrl, 'https://thumb.test/2?size=medium&sign=signed');
    assert.equal(payload.fsId, '2');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('files returns more than 100 imagelist images and retains thumbnail-less entries', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = requestUrl(input);
    if (url.searchParams.get('method') === 'list') {
      return jsonResponse({ errno: 0, total_num: 0, list: [] });
    }
    if (url.searchParams.get('method') === 'imagelist') {
      const images = Array.from({ length: 101 }, (_, index) => imageRecord(index + 1));
      images.push(imageRecord(500, { thumbs: null }));
      images.push(imageRecord(501, { server_filename: 'ignored.gif', path: '/Album/ignored.gif' }));
      return jsonResponse({ errno: 0, info: images });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const response = await workerRequest('/files?path=/Album&num=100', await authCookie());
    const data = await response.json();
    assert.equal(data.files.length, 102);
    assert.equal(data.files.find(file => file.fs_id === 500).thumbnail_url, null);
    assert.equal(data.files.some(file => file.fs_id === 501), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('files paginates generic directories and removes duplicate image records', async () => {
  const originalFetch = globalThis.fetch;
  const pages = [];
  globalThis.fetch = async input => {
    const url = requestUrl(input);
    if (url.searchParams.get('method') === 'list') {
      const page = Number(url.searchParams.get('page'));
      pages.push(page);
      if (page === 1) {
        return jsonResponse({
          errno: 0,
          total_num: 1001,
          list: Array.from({ length: 1000 }, (_, index) => ({
            fs_id: index + 1,
            isdir: 1,
            path: `/Album/Dir-${index + 1}`,
            server_filename: `Dir-${index + 1}`
          }))
        });
      }
      return jsonResponse({
        errno: 0,
        total_num: 1001,
        list: [{ fs_id: 1001, isdir: 1, path: '/Album/Last', server_filename: 'Last' }]
      });
    }
    if (url.searchParams.get('method') === 'imagelist') {
      return jsonResponse({ errno: 0, info: [imageRecord(2000), imageRecord(2000)] });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const response = await workerRequest('/files?path=/Album', await authCookie());
    const data = await response.json();
    assert.deepEqual(pages, [1, 2]);
    assert.equal(data.files.length, 1002);
    assert.equal(data.files.filter(file => file.fs_id === 2000).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('files fails instead of returning a partial directory', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = requestUrl(input);
    if (url.searchParams.get('method') === 'list') {
      return jsonResponse({ errno: 0, total_num: 1, list: [
        { fs_id: 1, isdir: 1, path: '/Album/Sub', server_filename: 'Sub' }
      ] });
    }
    if (url.searchParams.get('method') === 'imagelist') {
      return jsonResponse({ errno: 31034, errmsg: 'rate limited' });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const response = await workerRequest('/files?path=/Album', await authCookie());
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, 'BAIDU_FILES_UPSTREAM_FAILED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('thumbnail streams the signed imagelist URL only for the issuing account', async () => {
  const upstreamCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = requestUrl(input);
    if (url.searchParams.get('method') === 'list') {
      return jsonResponse({ errno: 0, total_num: 0, list: [] });
    }
    if (url.searchParams.get('method') === 'imagelist') {
      return jsonResponse({ errno: 0, info: [imageRecord(7)] });
    }
    if (url.hostname === 'thumb.test') {
      upstreamCalls.push(url);
      return new Response(PNG_BYTES, { status: 200, headers: { 'Content-Type': 'image/png' } });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const cookie = await authCookie('token-a');
    const filesResponse = await workerRequest('/files?path=/Album', cookie);
    const data = await filesResponse.json();
    const thumbnailPath = new URL(data.files[0].thumbnail_url).pathname + new URL(data.files[0].thumbnail_url).search;

    const thumbnailResponse = await workerRequest(thumbnailPath, cookie);
    assert.equal(thumbnailResponse.status, 200);
    assert.equal(thumbnailResponse.headers.get('Content-Type'), 'image/png');
    assert.deepEqual(new Uint8Array(await thumbnailResponse.arrayBuffer()), PNG_BYTES);
    assert.equal(upstreamCalls[0].searchParams.get('sign'), 'signed');
    assert.equal(upstreamCalls[0].searchParams.has('access_token'), false);

    const otherAccountResponse = await workerRequest(thumbnailPath, await authCookie('token-b'));
    assert.equal(otherAccountResponse.status, 403);
    assert.equal(upstreamCalls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('thumbnail rejects unsupported upstream MIME types', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = requestUrl(input);
    if (url.searchParams.get('method') === 'list') {
      return jsonResponse({ errno: 0, total_num: 0, list: [] });
    }
    if (url.searchParams.get('method') === 'imagelist') {
      return jsonResponse({ errno: 0, info: [imageRecord(8)] });
    }
    if (url.hostname === 'thumb.test') {
      return new Response('<html>blocked</html>', { headers: { 'Content-Type': 'text/html' } });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const cookie = await authCookie();
    const filesResponse = await workerRequest('/files?path=/Album', cookie);
    const data = await filesResponse.json();
    const thumbnailUrl = new URL(data.files[0].thumbnail_url);
    const response = await workerRequest(`${thumbnailUrl.pathname}${thumbnailUrl.search}`, cookie);
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, 'THUMBNAIL_UPSTREAM_FAILED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unknown paths return a JSON 404 with CORS headers', async () => {
  const response = await workerRequest('/nope');
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Not Found' });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ENV.FRONTEND_ORIGIN);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
});

test('OPTIONS preflight responds 204 with full CORS headers', async () => {
  const response = await worker.fetch(new Request('https://worker.test/files', {
    method: 'OPTIONS'
  }), ENV, {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ENV.FRONTEND_ORIGIN);
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), 'true');
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'GET, POST, OPTIONS');
});

test('logout clears the auth cookie and returns JSON', async () => {
  const response = await workerRequest('/logout', await authCookie());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { logged_out: true });
  assert.match(response.headers.get('Set-Cookie') || '', /^bd_token=;/);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ENV.FRONTEND_ORIGIN);
});

test('API_BASE_PATH routes prefixed paths and generates prefixed public URLs', async () => {
  const env = { ...ENV, API_BASE_PATH: '/api' };

  // 无 token 的 status 不触发上游请求
  const status = await workerRequest('/api/status', null, env);
  assert.equal(status.status, 200);
  assert.equal((await status.json()).logged_in, false);

  // 回调地址必须与控制台登记的地址逐字一致，否则百度会拒绝换取 token
  const auth = await workerRequest('/api/auth', null, { ...env, BAIDU_CLIENT_ID: 'client-id' });
  assert.equal(auth.status, 302);
  const authLocation = new URL(auth.headers.get('Location'));
  assert.equal(authLocation.searchParams.get('redirect_uri'), 'https://worker.test/api/callback');

  // 缩略图地址必须带前缀，否则前端会打到静态站而不是边缘函数
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = requestUrl(input);
    if (url.searchParams.get('method') === 'list') {
      return jsonResponse({ errno: 0, total_num: 0, list: [] });
    }
    if (url.searchParams.get('method') === 'imagelist') {
      return jsonResponse({ errno: 0, info: [imageRecord(2)] });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  try {
    const response = await workerRequest('/api/files?path=/Album', await authCookie(), env);
    const data = await response.json();
    assert.equal(new URL(data.files[0].thumbnail_url).pathname, '/api/thumbnail');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // 宽松匹配：未加前缀的路径同样可路由（生产由触发规则保证只收到 /api/*）
  assert.equal((await workerRequest('/status', null, env)).status, 200);
});

test('callback exchanges the code with the prefixed redirect_uri', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async input => {
    calls.push(requestUrl(input));
    return jsonResponse({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 });
  };

  try {
    const env = {
      ...ENV,
      API_BASE_PATH: '/api',
      BAIDU_CLIENT_ID: 'client-id',
      BAIDU_CLIENT_SECRET: 'client-secret',
      FRONTEND_URL: 'https://judian99.github.io/'
    };
    const response = await workerRequest('/api/callback?code=code-1', null, env);
    assert.equal(response.status, 302);
    assert.equal(calls[0].searchParams.get('redirect_uri'), 'https://worker.test/api/callback');
    assert.equal(response.headers.get('Location'), 'https://judian99.github.io/');
    assert.match(response.headers.get('Set-Cookie') || '', /SameSite=None/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('callback falls back to the frontend origin when FRONTEND_URL is unset', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({
    access_token: 'at', refresh_token: 'rt', expires_in: 3600
  });

  try {
    const { FRONTEND_URL, ...withoutFrontendUrl } = ENV;
    const response = await workerRequest('/callback?code=code-1', null, withoutFrontendUrl);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), `${ENV.FRONTEND_ORIGIN}/`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/**
 * EdgeOne Makers 运行时的 URLSearchParams 对字典里的非字符串值直接抛错：
 *   "Dict initializer must be keyed and valued on string type"
 * Node 与 Cloudflare 会隐式转换，所以在本地跑不出这个错误 ——
 * 这个桩把那套严格行为搬进测试，否则断言再多也挡不住回归。
 */
class StrictURLSearchParams extends URLSearchParams {
  constructor(init) {
    if (init && typeof init === 'object' && !Array.isArray(init) && !(init instanceof URLSearchParams)) {
      for (const [key, value] of Object.entries(init)) {
        if (typeof value !== 'string') {
          throw new TypeError(`Dict initializer must be keyed and valued on string type. (${key})`);
        }
      }
    }
    super(init);
  }
}

test('download survives Makers throwing on non-string URLSearchParams values', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  const originalURLSearchParams = globalThis.URLSearchParams;
  globalThis.URLSearchParams = StrictURLSearchParams;
  globalThis.fetch = async input => {
    const url = requestUrl(input);
    calls.push(url);
    if (url.searchParams.get('method') === 'filemetas') {
      return jsonResponse({ errno: 0, list: [{ dlink: 'https://dlink.test/f?id=7' }] });
    }
    return new Response(PNG_BYTES, { headers: { 'Content-Type': 'image/png' } });
  };

  try {
    const response = await workerRequest('/download?fs_id=7', await authCookie());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'image/png');

    const meta = calls.find(u => u.searchParams.get('method') === 'filemetas');
    assert.ok(meta, 'should request file metadata');
    assert.equal(meta.searchParams.get('dlink'), '1');
    assert.equal(meta.searchParams.get('fsids'), '[7]');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.URLSearchParams = originalURLSearchParams;
  }
});

test('COOKIE_SAME_SITE defaults to None and can be switched to Lax', async () => {
  const defaults = await workerRequest('/logout', await authCookie());
  assert.match(defaults.headers.get('Set-Cookie') || '', /SameSite=None/);

  const lax = await workerRequest('/logout', await authCookie(), { ...ENV, COOKIE_SAME_SITE: 'Lax' });
  assert.match(lax.headers.get('Set-Cookie') || '', /SameSite=Lax/);
});
