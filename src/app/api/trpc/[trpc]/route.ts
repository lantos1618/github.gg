import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/routes';
import { createContext } from '@/lib/trpc/trpc';

// Generous limit for legitimate batched page loads. Repo pages already fire
// up to 5 (plan + analysis-versions + analysis-cache + wiki + files); any
// additional ambient query (admin tools, feature flags, sidebar widgets)
// pushed it over and rejected the whole batch — every query in the batch
// returns 400 simultaneously, presenting in the UI as "Files: 0 of 0",
// "No scorecard available", etc. all at once.
const MAX_BATCH_SIZE = 20;

const handler = (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get('batch') === '1') {
    const paths = url.pathname.replace('/api/trpc/', '').split(',');
    if (paths.length > MAX_BATCH_SIZE) {
      console.warn(`[trpc] batch rejected: ${paths.length} queries exceeds ${MAX_BATCH_SIZE} — paths: ${paths.join(',')}`);
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