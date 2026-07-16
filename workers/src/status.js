import { getUserInfo } from './lib/baidu-pan.js';
import { requireSession } from './lib/auth-session.js';
import { jsonResponse } from './lib/http.js';

export async function handleStatus(request, env) {
  if (request.method !== 'GET') {
    return jsonResponse(request, env, 405, {
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  const auth = await requireSession(request, env);
  if (auth.error) {
    return jsonResponse(request, env, 200, {
      logged_in: false,
      user: null,
      code: auth.error
    });
  }

  try {
    const userInfo = await getUserInfo(auth.accessToken);
    return jsonResponse(request, env, 200, {
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
    console.error('Baidu status upstream failed');
    return jsonResponse(request, env, 200, {
      logged_in: false,
      user: null,
      code: 'BAIDU_AUTH_EXPIRED'
    });
  }
}
