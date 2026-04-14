/**
 * Generate a cryptographically secure random ID.
 * Uses crypto.getRandomValues for proper entropy.
 */
export function generateId(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(bytes[i] % chars.length);
  }
  return result;
}

/**
 * Generate a cryptographically secure random ID (alias for generateId).
 */
export function generateSecureId(length: number = 32): string {
  return generateId(length);
}
