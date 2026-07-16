import { handleFiles } from '../src/files.js';
import { optionsResponse } from '../src/lib/http.js';

export function onRequestGet(context) {
  return handleFiles(context.request, context.env, context);
}

export function onRequestOptions(context) {
  return optionsResponse(context.request, context.env);
}
