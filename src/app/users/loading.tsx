import { Skeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <div className="w-[90%] max-w-5xl mx-auto py-12">
      <Skeleton className="h-3 w-16 mb-3" />
      <Skeleton className="h-8 w-40 mb-2" />
      <Skeleton className="h-4 w-72 mb-8" />
      <Skeleton className="h-10 w-full max-w-md mb-8" />

      <div className="space-y-0">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f0f0f0]">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
