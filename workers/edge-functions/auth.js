import { handleAuth } from '../src/auth.js';

export function onRequestGet(context) {
  return handleAuth(context.request, context.env, context);
}
