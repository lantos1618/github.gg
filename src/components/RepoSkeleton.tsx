import { Skeleton } from '@/components/ui/skeleton';

export function RepoSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="border rounded-lg">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4" style={{ width: `${20 + i * 7}%` }} />
            <Skeleton className="h-3 w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
