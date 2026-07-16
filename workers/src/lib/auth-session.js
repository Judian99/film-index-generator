import { openPayload, sealPayload } from './crypto.js';

export const SESSION_PURPOSE = 'baidu-session';

export async function createSession(tokenData, env, now = Date.now()) {
  const ttlSeconds = positiveInteger(env.SESSION_TTL_SECONDS, 28_800);
  const baiduTtlSeconds = positiveInteger(tokenData.expires_in, ttlSeconds);
  const expiresAt = now + Math.min(ttlSeconds, baiduTtlSeconds) * 1000;
  return sealPayload({
    issuedAt: now,
    expiresAt,
    accessToken: tokenData.access_token,
    scope: tokenData.scope || ''
  }, SESSION_PURPOSE, env.TOKEN_ENCRYPTION_KEY);
}

export async function requireSession(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]+)$/);
  if (!match) return { error: 'NOT_AUTHENTICATED' };

  try {
    const session = await openPayload(
      match[1],
      SESSION_PURPOSE,
      env.TOKEN_ENCRYPTION_KEY
    );
    if (typeof session.accessToken !== 'string' || !session.accessToken) {
      return { error: 'NOT_AUTHENTICATED' };
    }
    return { session, accessToken: session.accessToken };
  } catch (error) {
    return { error: 'SESSION_EXPIRED' };
  }
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
