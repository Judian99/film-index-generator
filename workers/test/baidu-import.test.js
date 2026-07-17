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
