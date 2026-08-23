/**
 * 登录状态检查
 * 返回用户信息和登录状态
 */

import { getUserInfo } from './lib/baidu-pan.js';
import { getTokenFromCookie, jsonResponse, resolveOrigin } from './lib/http.js';

export async function handleStatus(request, env, ctx) {
  const origin = resolveOrigin(env);

  try {
    // 获取 token
    const tokenData = await getTokenFromCookie(request, env.TOKEN_ENCRYPTION_KEY);

    if (!tokenData || !tokenData.access_token) {
      return jsonResponse(origin, 200, {
        logged_in: false,
        user: null
      });
    }

    // 获取用户信息
    const userInfo = await getUserInfo(tokenData.access_token);

    return jsonResponse(origin, 200, {
      logged_in: true,
      user: {
        baidu_name: userInfo.baidu_name,
        netdisk_name: userInfo.netdisk_name,
        avatar_url: userInfo.avatar_url,
        vip_type: userInfo.vip_type,
        total_quota: userInfo.total,
        used_quota: userInfo.used
      }
    });

  } catch (error) {
    console.error('Status check error:', error);

    return jsonResponse(origin, 200, {
      logged_in: false,
      error: error.message
    });
  }
}
