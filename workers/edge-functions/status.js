import { handleStatus } from '../src/status.js';
import { optionsResponse } from '../src/lib/http.js';

export function onRequestGet(context) {
  return handleStatus(context.request, context.env, context);
}

export function onRequestOptions(context) {
  return optionsResponse(context.request, context.env);
}
