import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY is missing from environment variables');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encrypt(text: string): string {
  if (!text) return text;
  const KEY = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// 12-byte IV (24 hex) : 16-byte GCM auth tag (32 hex) : ciphertext (hex, even length).
// Deliberately strict — plaintext rows written before encryption was wired up
// (including JSON blobs, which are full of colons of their own) must pass
// through unchanged rather than being mistaken for our ciphertext format.
const CIPHERTEXT_FORMAT = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/i;

export function decrypt(cipherText: string): string {
  if (!cipherText || !CIPHERTEXT_FORMAT.test(cipherText)) return cipherText;
  try {
    const [ivHex, authTagHex, encryptedData] = cipherText.split(':');
    const KEY = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // Malformed/foreign data that happened to match the shape — fail safe by
    // returning it unchanged rather than crashing the caller.
    return cipherText;
  }
}