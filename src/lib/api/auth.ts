import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { publicApiKeys } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export type ApiKeyScope = 'read' | 'write' | 'admin';

export interface ValidatedApiKey {
  id: string;
  userId: string;
  name: string;
  scopes: string[];
  rateLimit: number;
}

/**
 * Generate a new API key
 * Returns the raw key (only shown once) and the hash for storage
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate 32 random bytes = 256 bits of entropy
  const randomBytes = crypto.randomBytes(32);
  const key = `gg_${randomBytes.toString('base64url')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 11); // "gg_" + first 8 chars

  return { key, hash, prefix };
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Extract API key from request headers
 * Supports: Authorization: Bearer gg_xxx or X-API-Key: gg_xxx
 */
export function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.substring(7);
    if (key.startsWith('gg_')) {
      return key;
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader?.startsWith('gg_')) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Validate an API key and return the key details
 */
export async function validateApiKey(key: string): Promise<ValidatedApiKey | null> {
  const keyHash = hashApiKey(key);

  const result = await db
    .select()
    .from(publicApiKeys)
    .where(
      and(
        eq(publicApiKeys.keyHash, keyHash),
        eq(publicApiKeys.isActive, true)
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const apiKey = result[0];

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  db.update(publicApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(publicApiKeys.id, apiKey.id))
    .execute()
    .catch(() => {}); // Ignore errors

  return {
    id: apiKey.id,
    userId: apiKey.userId,
    name: apiKey.name,
    scopes: apiKey.scopes,
    rateLimit: apiKey.rateLimit,
  };
}

/**
 * Check if API key has required scope
 */
export function hasScope(apiKey: ValidatedApiKey, requiredScope: ApiKeyScope): boolean {
  // Admin scope has access to everything
  if (apiKey.scopes.includes('admin')) {
    return true;
  }

  // Write scope includes read
  if (requiredScope === 'read' && apiKey.scopes.includes('write')) {
    return true;
  }

  return apiKey.scopes.includes(requiredScope);
}

/**
 * Middleware to require API key authentication
 * Usage: const apiKey = await requireApiKey(request, 'read');
 */
export async function requireApiKey(
  request: NextRequest,
  requiredScope: ApiKeyScope = 'read'
): Promise<ValidatedApiKey | NextResponse> {
  const key = extractApiKey(request);

  if (!key) {
    return NextResponse.json(
      {
        error: 'API key required',
        message: 'Provide an API key via Authorization: Bearer gg_xxx or X-API-Key header',
      },
      { status: 401 }
    );
  }

  const apiKey = await validateApiKey(key);

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Invalid API key',
        message: 'The provided API key is invalid, expired, or has been revoked',
      },
      { status: 401 }
    );
  }

  if (!hasScope(apiKey, requiredScope)) {
    return NextResponse.json(
      {
        error: 'Insufficient permissions',
        message: `This endpoint requires '${requiredScope}' scope`,
      },
      { status: 403 }
    );
  }

  return apiKey;
}

/**
 * Helper to check if result is an error response
 */
export function isErrorResponse(result: ValidatedApiKey | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
