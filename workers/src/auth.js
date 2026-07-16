import { getAuthUrl } from './lib/baidu-pan.js';
import { randomToken, sealPayload } from './lib/crypto.js';

const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const STATE_PURPOSE = 'baidu-oauth-state';

export async function handleAuth(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!env.BAIDU_CLIENT_ID || !env.TOKEN_ENCRYPTION_KEY) {
    return new Response('OAuth configuration error', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  const url = new URL(request.url);
  const challenge = url.searchParams.get('challenge') || '';
  if (!CHALLENGE_PATTERN.test(challenge)) {
    return new Response('Invalid authorization challenge', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  const now = Date.now();
  const state = await sealPayload({
    issuedAt: now,
    expiresAt: now + 10 * 60 * 1000,
    challenge,
    nonce: randomToken(16)
  }, STATE_PURPOSE, env.TOKEN_ENCRYPTION_KEY);
  const apiOrigin = env.API_ORIGIN || url.origin;
  const redirectUri = new URL('/callback', apiOrigin).toString();
  const authUrl = getAuthUrl(env.BAIDU_CLIENT_ID, redirectUri, state);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Referrer-Policy': 'no-referrer'
    }
  });
}

export { STATE_PURPOSE };
