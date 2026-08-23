/**
 * HTTP 公共工具：CORS 头、JSON 响应、Cookie token 解析、账号指纹
 */

import { decryptToken } from './crypto.js';

export const DEFAULT_FRONTEND_ORIGIN = 'https://judian99.github.io';

export function resolveOrigin(env) {
  return env?.FRONTEND_ORIGIN || DEFAULT_FRONTEND_ORIGIN;
}

/**
 * 生成 CORS 响应头（预检与普通响应共用同一份）
 */
export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  };
}

/**
 * 统一 JSON 响应；extraHeaders 用于附加 Set-Cookie 等
 */
export function jsonResponse(origin, status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
      ...extraHeaders
    }
  });
}

/**
 * 从 Cookie 中提取并解密 token，失败返回 null
 */
export async function getTokenFromCookie(request, encryptionKey) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/bd_token=([^;]+)/);
  if (!match) return null;

  try {
    return JSON.parse(await decryptToken(match[1], encryptionKey));
  } catch (error) {
    console.error('Token decryption failed');
    return null;
  }
}

/**
 * 访问令牌的 SHA-256 指纹，用于缩略图票据与账号绑定校验
 */
export async function tokenFingerprint(accessToken) {
  const data = new TextEncoder().encode(accessToken);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
