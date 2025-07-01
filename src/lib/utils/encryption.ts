import crypto from 'crypto';

export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(process.env.API_KEY_ENCRYPTION_SECRET!, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptApiKey(encryptedApiKey: string): string {
  const [ivHex, encrypted] = encryptedApiKey.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(process.env.API_KEY_ENCRYPTION_SECRET!, 'salt', 32);
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
} 