/**
 * Token 加密工具
 * 使用 Web Crypto API 进行 AES-GCM 加密/解密
 */

/**
 * 从密钥字符串生成 CryptoKey
 */
async function getEncryptionKey(keyString) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密 Token
 * @param {string} token - 要加密的 token
 * @param {string} encryptionKey - 加密密钥（32字符）
 * @returns {Promise<string>} Base64 编码的加密数据
 */
export async function encryptToken(token, encryptionKey) {
  const key = await getEncryptionKey(encryptionKey);
  const encoder = new TextEncoder();
  const data = encoder.encode(token);

  // 生成随机 IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 加密
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // 合并 IV 和加密数据
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // 转为 Base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * 解密 Token
 * @param {string} encryptedToken - Base64 编码的加密数据
 * @param {string} encryptionKey - 解密密钥（32字符）
 * @returns {Promise<string>} 解密后的 token
 */
export async function decryptToken(encryptedToken, encryptionKey) {
  const key = await getEncryptionKey(encryptionKey);

  // Base64 解码
  const combined = new Uint8Array(
    atob(encryptedToken).split('').map(c => c.charCodeAt(0))
  );

  // 分离 IV 和加密数据
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  // 解密
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}