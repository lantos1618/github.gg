import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createLogger } from '@/lib/logging';
import { semanticSearchActorKey } from './semantic-search-identity';

const logger = createLogger('SemanticSearchBudget');

// Search remains available as text search when REST Redis is absent or down.
const hasRedis = !!(
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
);

let actorLimiter: Ratelimit | null = null;
let globalLimiter: Ratelimit | null = null;
let requestActorLimiter: Ratelimit | null = null;
let requestGlobalLimiter: Ratelimit | null = null;
if (hasRedis) {
  try {
    const redis = Redis.fromEnv();
    actorLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'ratelimit:semantic-search:actor',
    });
    globalLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: 'ratelimit:semantic-search:global',
    });
    requestActorLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix: 'ratelimit:repo-search:actor',
    });
    requestGlobalLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(240, '1 m'),
      prefix: 'ratelimit:repo-search:global',
    });
  } catch (error) {
    logger.warn('REST Redis unavailable; paid semantic search disabled', { error: String(error) });
  }
}

/** Reserve a shared per-actor and global slot before calling paid embeddings. */
export async function reserveSemanticSearchEmbedding(
  request: Request,
  userId?: string | null,
): Promise<boolean> {
  if (!actorLimiter || !globalLimiter) return false;

  try {
    const global = await globalLimiter.limit('all');
    if (!global.success) return false;
    const actor = await actorLimiter.limit(semanticSearchActorKey(request, userId));
    return actor.success;
  } catch (error) {
    logger.warn('REST Redis rate limit failed; using text search', { error: String(error) });
    return false;
  }
}

/** Limit requests which fan out to GitHub for live repository visibility checks. */
export async function reserveRepoSearchRequest(
  request: Request,
  userId?: string | null,
): Promise<'allowed' | 'limited' | 'unavailable'> {
  // Keep basic repository browsing available during a Redis outage. Callers
  // must keep a small per-request result cap in this case.
  if (!requestActorLimiter || !requestGlobalLimiter) return 'unavailable';

  try {
    const global = await requestGlobalLimiter.limit('all');
    if (!global.success) return 'limited';
    const actor = await requestActorLimiter.limit(semanticSearchActorKey(request, userId));
    return actor.success ? 'allowed' : 'limited';
  } catch (error) {
    logger.warn('REST Redis request limit failed; using capped repository search', { error: String(error) });
    return 'unavailable';
  }
}
