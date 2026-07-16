import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../src/index.js';
import { createSession } from '../src/lib/auth-session.js';
import { decryptToken, openPayload, sealPayload, sha256Challenge } from '../src/lib/crypto.js';
import { STATE_PURPOSE } from '../src/auth.js';
import { HANDOFF_PURPOSE } from '../src/callback.js';

const ENV = {
  FRONTEND_ORIGIN: 'https://judian99.github.io',
  FRONTEND_URL: 'https://judian99.github.io/film-index-generator/',
  API_ORIGIN: 'https://api.edgeone.test',
  BAIDU_CLIENT_ID: 'client-id',
  BAIDU_CLIENT_SECRET: 'client-secret',
  TOKEN_ENCRYPTION_KEY: '12345678901234567890123456789012'
};
const PNG_BYTES = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

async function authHeader(accessToken = 'token-a') {
  const session = await createSession({
    access_token: accessToken,
    expires_in: 3600
  }, ENV);
  return `Bearer ${session}`;
}

async function workerRequest(path, authorization, env = ENV, options = {}) {
  const headers = new Headers(options.headers || {});
  if (authorization) headers.set('Authorization', authorization);
  return worker.fetch(new Request(`https://worker.test${path}`, {
    ...options,
    headers
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

test('auth creates a protected state bound to the production callback', async () => {
  const challenge = 'c'.repeat(43);
  const response = await workerRequest(`/auth?challenge=${challenge}`);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Cache-Control').includes('no-store'), true);

  const authorizationUrl = new URL(response.headers.get('Location'));
  assert.equal(authorizationUrl.origin, 'https://openapi.baidu.com');
  assert.equal(authorizationUrl.searchParams.get('client_id'), ENV.BAIDU_CLIENT_ID);
  assert.equal(authorizationUrl.searchParams.get('redirect_uri'), `${ENV.API_ORIGIN}/callback`);
  const stateValue = authorizationUrl.searchParams.get('state');
  assert.equal(stateValue.includes(challenge), false);
  const state = await openPayload(stateValue, STATE_PURPOSE, ENV.TOKEN_ENCRYPTION_KEY);
  assert.equal(state.challenge, challenge);
  assert.equal(typeof state.nonce, 'string');
});

test('callback validates state and returns an opaque frontend handoff', async () => {
  const challenge = 'd'.repeat(43);
  const now = Date.now();
  const state = await sealPayload({
    issuedAt: now,
    expiresAt: now + 60_000,
    challenge,
    nonce: 'nonce'
  }, STATE_PURPOSE, ENV.TOKEN_ENCRYPTION_KEY);
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = requestUrl(input);
    calls.push(url);
    return jsonResponse({
      access_token: 'baidu-plaintext-token',
      expires_in: 3600,
      scope: 'basic,netdisk'
    });
  };

  try {
    const response = await workerRequest(
      `/callback?code=authorization-code&state=${encodeURIComponent(state)}`
    );
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
    const location = response.headers.get('Location');
    assert.equal(location.includes('authorization-code'), false);
    assert.equal(location.includes('baidu-plaintext-token'), false);

    const redirect = new URL(location);
    assert.equal(`${redirect.origin}${redirect.pathname}`, ENV.FRONTEND_URL);
    assert.equal(redirect.search, '');
    const handoffValue = new URLSearchParams(redirect.hash.slice(1)).get('baidu_auth');
    const handoff = await openPayload(
      handoffValue,
      HANDOFF_PURPOSE,
      ENV.TOKEN_ENCRYPTION_KEY
    );
    assert.equal(handoff.challenge, challenge);
    assert.equal(handoff.accessToken, 'baidu-plaintext-token');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].searchParams.get('code'), 'authorization-code');
    assert.equal(calls[0].searchParams.get('redirect_uri'), `${ENV.API_ORIGIN}/callback`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('callback rejects missing, tampered, expired, and denied authorization state', async () => {
  const now = Date.now();
  const expiredState = await sealPayload({
    issuedAt: now - 120_000,
    expiresAt: now - 60_000,
    challenge: 'e'.repeat(43),
    nonce: 'nonce'
  }, STATE_PURPOSE, ENV.TOKEN_ENCRYPTION_KEY);
  const validState = await sealPayload({
    issuedAt: now,
    expiresAt: now + 60_000,
    challenge: 'f'.repeat(43),
    nonce: 'nonce'
  }, STATE_PURPOSE, ENV.TOKEN_ENCRYPTION_KEY);
  const tamperedState = `${validState[0] === 'A' ? 'B' : 'A'}${validState.slice(1)}`;
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('Token exchange must not run');
  };

  try {
    for (const path of [
      '/callback',
      `/callback?code=code&state=${encodeURIComponent(tamperedState)}`,
      `/callback?code=code&state=${encodeURIComponent(expiredState)}`,
      `/callback?error=access_denied&state=${encodeURIComponent(validState)}`
    ]) {
      const response = await workerRequest(path);
      assert.equal(response.status, 400);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sealed payload metadata cannot be overridden by callers', async () => {
  const now = Date.now();
  const value = await sealPayload({
    version: 99,
    purpose: HANDOFF_PURPOSE,
    issuedAt: now,
    expiresAt: now + 60_000
  }, STATE_PURPOSE, ENV.TOKEN_ENCRYPTION_KEY);
  const payload = await openPayload(value, STATE_PURPOSE, ENV.TOKEN_ENCRYPTION_KEY);
  assert.equal(payload.version, 1);
  assert.equal(payload.purpose, STATE_PURPOSE);
});
test('auth exchange validates verifier and returns an opaque session', async () => {
  const verifier = 'v'.repeat(43);
  const now = Date.now();
  const handoff = await sealPayload({
    issuedAt: now,
    expiresAt: now + 60_000,
    challenge: await sha256Challenge(verifier),
    accessToken: 'baidu-secret-token',
    expiresIn: 3600,
    scope: 'basic,netdisk'
  }, HANDOFF_PURPOSE, ENV.TOKEN_ENCRYPTION_KEY);

  const response = await workerRequest('/auth/exchange', null, ENV, {
    method: 'POST',
    headers: {
      Origin: ENV.FRONTEND_ORIGIN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ handoff, verifier })
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(typeof data.session, 'string');
  assert.equal(data.session.includes('baidu-secret-token'), false);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ errno: 0, baidu_name: 'tester' });
  try {
    const authenticatedStatus = await workerRequest('/status', `Bearer ${data.session}`);
    assert.equal(authenticatedStatus.status, 200);
    assert.equal((await authenticatedStatus.json()).logged_in, true);
    assert.equal(authenticatedStatus.headers.get('Access-Control-Allow-Credentials'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('auth exchange rejects another origin and a wrong verifier', async () => {
  const verifier = 'a'.repeat(43);
  const now = Date.now();
  const handoff = await sealPayload({
    issuedAt: now,
    expiresAt: now + 60_000,
    challenge: await sha256Challenge(verifier),
    accessToken: 'token-a',
    expiresIn: 3600
  }, HANDOFF_PURPOSE, ENV.TOKEN_ENCRYPTION_KEY);

  const wrongOrigin = await workerRequest('/auth/exchange', null, ENV, {
    method: 'POST',
    headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ handoff, verifier })
  });
  assert.equal(wrongOrigin.status, 403);
  assert.equal(wrongOrigin.headers.get('Access-Control-Allow-Origin'), null);

  const wrongVerifier = await workerRequest('/auth/exchange', null, ENV, {
    method: 'POST',
    headers: { Origin: ENV.FRONTEND_ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ handoff, verifier: 'b'.repeat(43) })
  });
  assert.equal(wrongVerifier.status, 401);
});

test('download rejects metadata above the configured size before fetching the dlink', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = requestUrl(input);
    calls.push(url);
    return jsonResponse({
      errno: 0,
      list: [{ dlink: 'https://download.test/file?x=1', size: 101 }]
    });
  };

  try {
    const response = await workerRequest(
      '/download?fs_id=7',
      await authHeader(),
      { ...ENV, MAX_DOWNLOAD_BYTES: '100' }
    );
    assert.equal(response.status, 413);
    assert.equal((await response.json()).code, 'FILE_TOO_LARGE');
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('download streams an upstream response without Content-Length', async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    if (call === 1) {
      return jsonResponse({
        errno: 0,
        list: [{ dlink: 'https://download.test/file?x=1', size: PNG_BYTES.byteLength }]
      });
    }
    return new Response(PNG_BYTES, {
      status: 200,
      headers: { 'Content-Type': 'image/png' }
    });
  };

  try {
    const response = await workerRequest('/download?fs_id=7', await authHeader());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Length'), null);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), PNG_BYTES);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('CORS preflight allows Authorization only for the configured frontend', async () => {
  const allowed = await workerRequest('/files', null, ENV, {
    method: 'OPTIONS',
    headers: { Origin: ENV.FRONTEND_ORIGIN }
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), ENV.FRONTEND_ORIGIN);
  assert.match(allowed.headers.get('Access-Control-Allow-Headers'), /Authorization/);

  const denied = await workerRequest('/files', null, ENV, {
    method: 'OPTIONS',
    headers: { Origin: 'https://attacker.example' }
  });
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
});

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
    const response = await workerRequest('/files?path=/Album&page=1&num=1', await authHeader());
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
    const response = await workerRequest('/files?path=/Album&num=100', await authHeader());
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
    const response = await workerRequest('/files?path=/Album', await authHeader());
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
    const response = await workerRequest('/files?path=/Album', await authHeader());
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, 'BAIDU_FILES_UPSTREAM_FAILED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('thumbnail streams the signed imagelist URL without a session cookie', async () => {
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
    const authorization = await authHeader('token-a');
    const filesResponse = await workerRequest('/files?path=/Album', authorization);
    const data = await filesResponse.json();
    const thumbnailPath = new URL(data.files[0].thumbnail_url).pathname + new URL(data.files[0].thumbnail_url).search;

    const thumbnailResponse = await workerRequest(thumbnailPath);
    assert.equal(thumbnailResponse.status, 200);
    assert.equal(thumbnailResponse.headers.get('Content-Type'), 'image/png');
    assert.deepEqual(new Uint8Array(await thumbnailResponse.arrayBuffer()), PNG_BYTES);
    assert.equal(upstreamCalls[0].searchParams.get('sign'), 'signed');
    assert.equal(upstreamCalls[0].searchParams.has('access_token'), false);

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
    const authorization = await authHeader();
    const filesResponse = await workerRequest('/files?path=/Album', authorization);
    const data = await filesResponse.json();
    const thumbnailUrl = new URL(data.files[0].thumbnail_url);
    const response = await workerRequest(`${thumbnailUrl.pathname}${thumbnailUrl.search}`);
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, 'THUMBNAIL_UPSTREAM_FAILED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
