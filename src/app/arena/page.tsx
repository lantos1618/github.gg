import { Suspense } from 'react';
import { ArenaClientView } from '@/components/arena/ArenaClientView';
import { Skeleton } from '@/components/ui/skeleton';

export default function ArenaPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    }>
      <ArenaClientView />
    </Suspense>
  );
} 