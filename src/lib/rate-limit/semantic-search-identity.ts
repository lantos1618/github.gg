import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

function hashIdentity(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Vercel overwrites this header, so only trust it inside a Vercel deployment. */
export function semanticSearchActorKey(request: Request, userId?: string | null): string {
  if (process.env.VERCEL === '1') {
    const ip = request.headers.get('x-vercel-forwarded-for')?.trim();
    if (ip && isIP(ip)) return `ip:${hashIdentity(ip)}`;
  }
  return userId ? `user:${hashIdentity(userId)}` : 'anonymous';
}
