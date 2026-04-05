import { Skeleton } from '@/components/ui/skeleton';

export function RepoHeaderSkeleton() {
  return (
    <div className="space-y-3 py-4">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
