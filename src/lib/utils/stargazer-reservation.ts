import { Redis } from '@upstash/redis';
import {
  reserveStargazerPerkWithStore,
  finishStargazerPerkWithStore,
  type StargazerReservationResult,
  type StargazerPerkReservation,
} from './stargazer-reservation-core';

export type { StargazerPerkReservation, StargazerReservationResult } from './stargazer-reservation-core';

const hasRedis = !!(
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
);

let redis: Redis | null = null;
if (hasRedis) {
  try {
    redis = Redis.fromEnv();
  } catch (error) {
    console.error('Failed to initialize stargazer perk reservations:', error);
  }
}

export function reserveStargazerPerk(
  userId: string,
  feature: string,
  at = new Date(),
): Promise<StargazerReservationResult> {
  return reserveStargazerPerkWithStore(redis, userId, feature, at);
}

export function finishStargazerPerk(
  reservation: StargazerPerkReservation | undefined,
  completed: boolean,
): Promise<void> {
  return finishStargazerPerkWithStore(redis, reservation, completed);
}
