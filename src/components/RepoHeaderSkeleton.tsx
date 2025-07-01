import { Skeleton } from './ui/skeleton';

export function RepoHeaderSkeleton() {
  return (
    <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-20" />
          <span className="text-gray-800">/</span>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
        </div>
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
} 