import { TRPCClientErrorLike } from '@trpc/client';
import { TRPCDefaultErrorShape } from '@trpc/server';
import { LoadingWave } from './LoadingWave';

interface RepoStatusProps {
  isLoading?: boolean;
  error?: { message: string } | null;
}

export function RepoStatus({ 
  isLoading, 
  error
}: RepoStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <span className="text-lg text-black">Loading</span>
          <LoadingWave size="md" color="black" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500">
          Error loading repository: {error.message}
        </div>
      </div>
    );
  }

  return null;
} 