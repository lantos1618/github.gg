import { Suspense } from 'react';
import { createCaller } from '@/lib/trpc/server';
import { ArenaClientView } from '@/components/arena/ArenaClientView';
import { Skeleton } from '@/components/ui/skeleton';

export default async function ArenaPage() {
  const caller = await createCaller();
  
  // Fetch data on server (SSR)
  const leaderboard = await caller.arena.getLeaderboard({ limit: 50 });

  return (
    <Suspense fallback={
      <div className="max-w-[1400px] mx-auto px-6 py-20 space-y-12">
        <Skeleton className="h-32 w-full max-w-md mx-auto" />
        <Skeleton className="h-96 w-full" />
      </div>
    }>
      <ArenaClientView initialLeaderboard={leaderboard} />
    </Suspense>
  );
}
