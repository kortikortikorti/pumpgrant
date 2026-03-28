import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(userId: string): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 'default-dev-secret-change-in-production';
  return crypto.scryptSync(`${userId}:${secret}`, 'pumpgrant-salt', 32);
}

export function encryptPrivateKey(privateKeyBytes: Uint8Array, userId: string): string {
  const key = getEncryptionKey(userId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(privateKeyBytes)),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted (all base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptPrivateKey(encryptedString: string, userId: string): Uint8Array {
  const key = getEncryptionKey(userId);
  const [ivB64, tagB64, encB64] = encryptedString.split(':');

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return new Uint8Array(decrypted);
}
