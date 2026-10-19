import { createHash, randomUUID } from 'node:crypto';

const LEASE_SECONDS = 30 * 60;

export interface StargazerPerkReservation {
  leaseKey: string;
  completionKey: string;
  token: string;
  completionTtlSeconds: number;
}

export type ReservationStore = {
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
};

export type StargazerReservationResult =
  | { status: 'acquired'; reservation: StargazerPerkReservation }
  | { status: 'busy' | 'used' | 'unavailable' };

const CLAIM_SCRIPT = `
  if redis.call('EXISTS', KEYS[2]) == 1 then return 2 end
  if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', ARGV[2]) then return 1 end
  return 0
`;

const FINISH_SCRIPT = `
  if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
  if ARGV[2] == '1' then
    redis.call('SET', KEYS[2], '1', 'EX', ARGV[3])
  end
  redis.call('DEL', KEYS[1])
  return 1
`;

/** Atomically reserve one user/feature/month across all serverless instances. */
export async function reserveStargazerPerkWithStore(
  store: ReservationStore | null,
  userId: string,
  feature: string,
  at = new Date(),
): Promise<StargazerReservationResult> {
  if (!store) return { status: 'unavailable' };
  const month = at.toISOString().slice(0, 7);
  const userHash = createHash('sha256').update(userId).digest('hex');
  const prefix = `perk:stargazer:${month}:${feature}:${userHash}`;
  const periodEnd = Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1);
  const reservation: StargazerPerkReservation = {
    leaseKey: `${prefix}:lease`,
    completionKey: `${prefix}:completed`,
    token: randomUUID(),
    completionTtlSeconds: Math.max(1, Math.ceil((periodEnd - at.getTime()) / 1000)),
  };

  try {
    const result = Number(await store.eval(CLAIM_SCRIPT,
      [reservation.leaseKey, reservation.completionKey],
      [reservation.token, String(LEASE_SECONDS)]));
    if (result === 2) return { status: 'used' };
    if (result === 1) return { status: 'acquired', reservation };
    return { status: 'busy' };
  } catch (error) {
    console.error('Failed to reserve stargazer perk:', error);
    return { status: 'unavailable' };
  }
}

/** Mark a successful generation used, or release a failed attempt for retry. */
export async function finishStargazerPerkWithStore(
  store: ReservationStore | null,
  reservation: StargazerPerkReservation | undefined,
  completed: boolean,
): Promise<void> {
  if (!reservation || !store) return;
  await store.eval(FINISH_SCRIPT,
    [reservation.leaseKey, reservation.completionKey],
    [reservation.token, completed ? '1' : '0', String(reservation.completionTtlSeconds)]);
}
