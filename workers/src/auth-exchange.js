import { createSession } from './lib/auth-session.js';
import { openPayload, sha256Challenge } from './lib/crypto.js';
import { errorResponse, jsonResponse, originAllowed } from './lib/http.js';
import { HANDOFF_PURPOSE } from './callback.js';

export async function handleAuthExchange(request, env) {
  if (request.method !== 'POST') {
    return errorResponse(request, env, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }
  if (!originAllowed(request, env)) {
    return errorResponse(request, env, 403, 'Origin not allowed', 'ORIGIN_NOT_ALLOWED');
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return errorResponse(request, env, 400, 'Invalid request body', 'INVALID_REQUEST');
  }

  const handoffValue = body?.handoff;
  const verifier = body?.verifier;
  if (
    typeof handoffValue !== 'string' ||
    typeof verifier !== 'string' ||
    verifier.length < 43 ||
    verifier.length > 128
  ) {
    return errorResponse(request, env, 400, 'Invalid authorization exchange', 'INVALID_HANDOFF');
  }

  try {
    const handoff = await openPayload(
      handoffValue,
      HANDOFF_PURPOSE,
      env.TOKEN_ENCRYPTION_KEY
    );
    if (await sha256Challenge(verifier) !== handoff.challenge) {
      return errorResponse(request, env, 401, 'Authorization verifier does not match', 'INVALID_VERIFIER');
    }
    if (typeof handoff.accessToken !== 'string' || !handoff.accessToken) {
      throw new Error('Invalid handoff');
    }

    const session = await createSession({
      access_token: handoff.accessToken,
      expires_in: handoff.expiresIn,
      scope: handoff.scope
    }, env);
    return jsonResponse(request, env, 200, { session });
  } catch (error) {
    return errorResponse(request, env, 401, 'Authorization exchange expired', 'HANDOFF_EXPIRED');
  }
}
