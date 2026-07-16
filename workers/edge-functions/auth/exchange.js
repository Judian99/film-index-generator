import { handleAuthExchange } from '../../src/auth-exchange.js';
import { optionsResponse } from '../../src/lib/http.js';

export function onRequestPost(context) {
  return handleAuthExchange(context.request, context.env, context);
}

export function onRequestOptions(context) {
  return optionsResponse(context.request, context.env);
}
