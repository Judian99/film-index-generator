/**
 * 百度网盘 API 封装
 * 文档: https://pan.baidu.com/union/doc/
 */

const BAIDU_API = {
  // OAuth
  AUTH_URL: 'https://openapi.baidu.com/oauth/2.0/authorize',
  TOKEN_URL: 'https://openapi.baidu.com/oauth/2.0/token',

  // API
  USER_INFO: 'https://pan.baidu.com/rest/2.0/xpan/nas',
  FILE_LIST: 'https://pan.baidu.com/rest/2.0/xpan/file',
  FILE_META: 'https://pan.baidu.com/rest/2.0/xpan/multimedia'
};

/**
 * 生成 OAuth 授权 URL
 */
export function getAuthUrl(clientId, redirectUri, state = '') {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'basic,netdisk',
    state: state
  });

  return `${BAIDU_API.AUTH_URL}?${params.toString()}`;
}

/**
 * 用授权码换取 access_token
 */
export async function exchangeToken(code, clientId, clientSecret, redirectUri) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  });

  const response = await fetch(`${BAIDU_API.TOKEN_URL}?${params.toString()}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    const reason = data.error_description || data.error || `HTTP ${response.status}`;
    throw new Error(`Token exchange error: ${reason}`);
  }

  return data;
}

/**
 * 获取用户信息
 */
export async function getUserInfo(accessToken) {
  const url = `${BAIDU_API.USER_INFO}?method=uinfo&access_token=${accessToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Get user info failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.errno !== 0) {
    throw new Error(`API error: ${data.errmsg || data.errno}`);
  }

  return data;
}

async function requestFileApi(operation, path, params) {
  const url = new URL(BAIDU_API.FILE_LIST);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    const upstreamError = new Error(`Baidu ${operation} request failed`);
    upstreamError.operation = operation;
    upstreamError.path = path;
    upstreamError.cause = error;
    throw upstreamError;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.errno !== 0) {
    const reason = data?.errmsg || data?.errno || `HTTP ${response.status}`;
    const upstreamError = new Error(`Baidu ${operation} failed: ${reason}`);
    upstreamError.operation = operation;
    upstreamError.path = path;
    upstreamError.status = response.status;
    upstreamError.errno = data?.errno;
    throw upstreamError;
  }

  return data;
}

/**
 * 获取通用文件列表
 */
export async function listFiles(accessToken, path = '/', page = 1, num = 1000, order = 'name', desc = 0) {
  return requestFileApi('list', path, {
    method: 'list',
    access_token: accessToken,
    dir: path,
    page,
    num,
    order,
    desc
  });
}

/**
 * 获取目录下的图片及缩略图
 */
export async function listImages(accessToken, path = '/') {
  return requestFileApi('imagelist', path, {
    method: 'imagelist',
    access_token: accessToken,
    parent_path: path,
    recursion: 0,
    web: 1
  });
}

/**
 * 获取文件下载链接
 */
export async function getDownloadUrl(accessToken, fsId) {
  const params = new URLSearchParams({
    method: 'filemetas',
    access_token: accessToken,
    fsids: `[${fsId}]`,
    dlink: 1
  });

  const url = `${BAIDU_API.FILE_META}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Get download link failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.errno !== 0) {
    throw new Error(`API error: ${data.errmsg || data.errno}`);
  }

  if (!data.list || data.list.length === 0) {
    throw new Error('No download link found');
  }

  return data.list[0].dlink;
}

/**
 * 构建完整的下载 URL（带 access_token）
 */
export function buildDownloadUrl(dlink, accessToken) {
  return `${dlink}&access_token=${accessToken}`;
}