import { appRouter } from './routes';
import { createContextInner } from './trpc';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * Create a server-side caller for tRPC procedures
 * Use this in Server Components to call tRPC procedures directly
 */
export async function createCaller() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const ctx = await createContextInner({ session });

  return appRouter.createCaller({
    ...ctx,
    req: new Request('http://localhost:3000'),
  });
}
