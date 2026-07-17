/**
 * 登录状态检查
 * 返回用户信息和登录状态
 */

import { getUserInfo } from './lib/baidu-pan.js';
import { decryptToken } from './lib/crypto.js';

/**
 * 从 Cookie 中提取并解密 token
 */
async function getTokenFromCookie(request, encryptionKey) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/bd_token=([^;]+)/);

  if (!match) {
    return null;
  }

  try {
    const encryptedToken = match[1];
    const decryptedPayload = await decryptToken(encryptedToken, encryptionKey);
    const tokenData = JSON.parse(decryptedPayload);
    return tokenData;
  } catch (error) {
    console.error('Token decryption failed:', error);
    return null;
  }
}

export async function handleStatus(request, env, ctx) {
  const origin = env.FRONTEND_ORIGIN || 'https://judian99.github.io';

  try {
    // 获取 token
    const tokenData = await getTokenFromCookie(request, env.TOKEN_ENCRYPTION_KEY);

    if (!tokenData || !tokenData.access_token) {
      return new Response(JSON.stringify({
        logged_in: false,
        user: null
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      });
    }

    // 获取用户信息
    const userInfo = await getUserInfo(tokenData.access_token);

    return new Response(JSON.stringify({
      logged_in: true,
      user: {
        baidu_name: userInfo.baidu_name,
        netdisk_name: userInfo.netdisk_name,
        avatar_url: userInfo.avatar_url,
        vip_type: userInfo.vip_type,
        total_quota: userInfo.total,
        used_quota: userInfo.used
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    });

  } catch (error) {
    console.error('Status check error:', error);

    return new Response(JSON.stringify({
      logged_in: false,
      error: error.message
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    });
  }
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true'
  };
}