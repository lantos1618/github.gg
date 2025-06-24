import { PostHog } from 'posthog-node';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { env } from '@/lib/env';

export async function createContext({ req }: CreateNextContextOptions) {
  const posthog = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  return {
    req,
    posthog,
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>; 