import { Skeleton } from '@/components/ui/skeleton';

export function RepoSkeleton() {
  return (
    <div className="w-[90%] max-w-5xl mx-auto pt-6 sm:pt-8 space-y-4">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2 mt-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
