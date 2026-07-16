import { handleLogout } from '../src/logout.js';
import { optionsResponse } from '../src/lib/http.js';

export function onRequestPost(context) {
  return handleLogout(context.request, context.env, context);
}

export function onRequestOptions(context) {
  return optionsResponse(context.request, context.env);
}
