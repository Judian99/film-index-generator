import { handleDownload } from '../src/download.js';
import { optionsResponse } from '../src/lib/http.js';

export function onRequestGet(context) {
  return handleDownload(context.request, context.env, context);
}

export function onRequestOptions(context) {
  return optionsResponse(context.request, context.env);
}
