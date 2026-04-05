import { Skeleton } from '@/components/ui/skeleton';

export function FileListSkeleton() {
  return (
    <div className="space-y-2 py-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}
