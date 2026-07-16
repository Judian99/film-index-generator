const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getEncryptionKey(keyString) {
  const keyData = encoder.encode(keyString);
  if (keyData.byteLength !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be exactly 32 UTF-8 bytes');
  }
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toBase64Url(bytes) {
  let value = '';
  bytes.forEach(byte => {
    value += String.fromCharCode(byte);
  });
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid encrypted value');
  }
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function randomToken(byteLength = 32) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256Challenge(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return toBase64Url(new Uint8Array(digest));
}

export async function encryptToken(token, encryptionKey) {
  const key = await getEncryptionKey(encryptionKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return toBase64Url(combined);
}

export async function decryptToken(encryptedToken, encryptionKey) {
  const key = await getEncryptionKey(encryptionKey);
  const combined = fromBase64Url(encryptedToken);
  if (combined.byteLength <= 28) throw new Error('Invalid encrypted value');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: combined.slice(0, 12) },
    key,
    combined.slice(12)
  );
  return decoder.decode(decrypted);
}

export async function sealPayload(payload, purpose, encryptionKey) {
  const value = {
    ...payload,
    version: 1,
    purpose
  };
  return encryptToken(JSON.stringify(value), encryptionKey);
}

export async function openPayload(value, purpose, encryptionKey, now = Date.now()) {
  const payload = JSON.parse(await decryptToken(value, encryptionKey));
  if (
    payload?.version !== 1 ||
    payload?.purpose !== purpose ||
    !Number.isFinite(payload.issuedAt) ||
    !Number.isFinite(payload.expiresAt) ||
    payload.issuedAt > now + 60_000 ||
    payload.expiresAt <= now
  ) {
    throw new Error(`Invalid or expired ${purpose}`);
  }
  return payload;
}
