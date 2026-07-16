import { handleCallback } from '../src/callback.js';

export function onRequestGet(context) {
  return handleCallback(context.request, context.env, context);
}
