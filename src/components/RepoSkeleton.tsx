import { Skeleton } from '@/components/ui/skeleton';

export function RepoSkeleton() {
  return (
    <div className="w-[90%] max-w-[1100px] mx-auto pt-6 sm:pt-8">
      {/* Header skeleton matching RepoHeader dimensions */}
      <div className="mb-8">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-8 w-64 mb-2" />
        <div className="flex items-center gap-4 mt-2 mb-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Content placeholder */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f0f0f0]">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4" style={{ width: `${20 + i * 7}%` }} />
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
