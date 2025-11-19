import crypto from 'crypto';

export function encryptApiKey(apiKey: string): string {
  if (!process.env.API_KEY_ENCRYPTION_SECRET) {
    throw new Error('API_KEY_ENCRYPTION_SECRET is not set');
  }

  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(process.env.API_KEY_ENCRYPTION_SECRET, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Format: salt:iv:encrypted
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
}

export function decryptApiKey(encryptedApiKey: string): string {
  if (!process.env.API_KEY_ENCRYPTION_SECRET) {
    throw new Error('API_KEY_ENCRYPTION_SECRET is not set');
  }

  const [saltHex, ivHex, encrypted] = encryptedApiKey.split(':');
  
  if (!saltHex || !ivHex || !encrypted) {
    throw new Error('Invalid encrypted API key format');
  }

  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(process.env.API_KEY_ENCRYPTION_SECRET, salt, 32);
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
} 