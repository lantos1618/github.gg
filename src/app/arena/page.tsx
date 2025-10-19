import { Suspense } from 'react';
import { ArenaClientView } from '@/components/arena/ArenaClientView';
import { LoadingWave } from '@/components/LoadingWave';

export default function ArenaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <LoadingWave />
      </div>
    }>
      <ArenaClientView />
    </Suspense>
  );
} 