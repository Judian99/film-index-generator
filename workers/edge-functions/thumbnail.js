import { handleThumbnail } from '../src/thumbnail.js';
import { optionsResponse } from '../src/lib/http.js';

export function onRequestGet(context) {
  return handleThumbnail(context.request, context.env, context);
}

export function onRequestOptions(context) {
  return optionsResponse(context.request, context.env);
}
