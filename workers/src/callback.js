import { exchangeToken } from './lib/baidu-pan.js';
import { openPayload, sealPayload } from './lib/crypto.js';
import { STATE_PURPOSE } from './auth.js';

export const HANDOFF_PURPOSE = 'baidu-auth-handoff';

export async function handleCallback(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    return new Response('Baidu authorization was denied', {
      status: 400,
      headers: noStoreHeaders()
    });
  }

  const code = url.searchParams.get('code');
  const stateValue = url.searchParams.get('state');
  if (!code || !stateValue) {
    return new Response('Authorization failed', {
      status: 400,
      headers: noStoreHeaders()
    });
  }

  let state;
  try {
    state = await openPayload(
      stateValue,
      STATE_PURPOSE,
      env.TOKEN_ENCRYPTION_KEY
    );
  } catch (error) {
    return new Response('Invalid authorization state', {
      status: 400,
      headers: noStoreHeaders()
    });
  }

  if (typeof state.challenge !== 'string' || !state.challenge) {
    return new Response('Invalid authorization state', {
      status: 400,
      headers: noStoreHeaders()
    });
  }

  try {
    const apiOrigin = env.API_ORIGIN || url.origin;
    const redirectUri = new URL('/callback', apiOrigin).toString();
    const tokenData = await exchangeToken(
      code,
      env.BAIDU_CLIENT_ID,
      env.BAIDU_CLIENT_SECRET,
      redirectUri
    );
    const now = Date.now();
    const ttlSeconds = positiveInteger(env.HANDOFF_TTL_SECONDS, 300);
    const handoff = await sealPayload({
      issuedAt: now,
      expiresAt: now + ttlSeconds * 1000,
      challenge: state.challenge,
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in || 2_592_000,
      scope: tokenData.scope || ''
    }, HANDOFF_PURPOSE, env.TOKEN_ENCRYPTION_KEY);
    const frontendUrl = new URL(env.FRONTEND_URL || '/');
    frontendUrl.hash = `baidu_auth=${encodeURIComponent(handoff)}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...noStoreHeaders(),
        'Location': frontendUrl.toString()
      }
    });
  } catch (error) {
    console.error('Baidu token exchange failed');
    return new Response('Authentication failed', {
      status: 502,
      headers: noStoreHeaders()
    });
  }
}

function noStoreHeaders() {
  return {
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff'
  };
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
