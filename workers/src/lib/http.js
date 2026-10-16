/**
 * HTTP 公共工具：CORS 头、JSON 响应、Cookie token 解析、账号指纹
 */

import { decryptToken } from './crypto.js';

export const DEFAULT_FRONTEND_ORIGIN = 'https://www.filmindex.site';
export const DEFAULT_SAME_SITE = 'None';

export function resolveOrigin(env) {
  const raw = env?.FRONTEND_ORIGIN;
  if (typeof raw !== 'string' || !raw.trim()) return DEFAULT_FRONTEND_ORIGIN;
  // 去掉结尾斜杠。浏览器发出的 Origin 头不带斜杠，带上就永远匹配不到，
  // 表现为「CORS 配了却依然被拒」；顺带避免 FRONTEND_URL 回落时拼出双斜杠。
  return raw.trim().replace(/\/+$/, '');
}

/**
 * 部署路径前缀。同域部署（EdgeOne 站点边缘函数）时设为 '/api'，
 * 独立域名部署（Cloudflare Workers）时留空。
 */
export function resolveBasePath(env) {
  const raw = env?.API_BASE_PATH;
  if (typeof raw !== 'string' || !raw.trim()) return '';

  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * 拼接对外可访问的绝对路径（含前缀），用于回调地址与缩略图地址生成
 */
export function withBasePath(env, path) {
  return `${resolveBasePath(env)}${path}`;
}

/**
 * Cookie 的 SameSite 属性。同域部署后可改为 'Lax' 以提高健壮性；
 * 前端与 API 跨站时必须保持 'None'（配合 Secure）。
 */
export function resolveSameSite(env) {
  const raw = env?.COOKIE_SAME_SITE;
  if (typeof raw !== 'string' || !raw.trim()) return DEFAULT_SAME_SITE;

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'lax') return 'Lax';
  if (normalized === 'strict') return 'Strict';
  return 'None';
}

/**
 * 登录 Cookie 的 Set-Cookie 值；maxAge 为 0 表示清除
 */
export function authCookieHeader(value, env, maxAge) {
  return [
    `bd_token=${value}`,
    'HttpOnly',
    'Secure',
    `SameSite=${resolveSameSite(env)}`,
    `Max-Age=${maxAge}`,
    'Path=/'
  ].join('; ');
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
