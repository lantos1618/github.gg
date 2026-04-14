import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/routes';
import { createContext } from '@/lib/trpc/trpc';

const MAX_BATCH_SIZE = 5;

const handler = (req: Request) => {
  // Block oversized batches — prevents abuse of expensive AI procedures
  const url = new URL(req.url);
  if (url.searchParams.get('batch') === '1') {
    const paths = url.pathname.replace('/api/trpc/', '').split(',');
    if (paths.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ error: `Batch size ${paths.length} exceeds limit of ${MAX_BATCH_SIZE}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });
};

export { handler as GET, handler as POST };

// Set maximum duration to 5 minutes for long-running operations like wiki generation
export const maxDuration = 300; 