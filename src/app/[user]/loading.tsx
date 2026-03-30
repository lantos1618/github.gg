import { Skeleton } from '@/components/ui/skeleton';

export default function UserLoading() {
  return (
    <div className="w-[90%] max-w-[900px] mx-auto py-12">
      {/* Header */}
      <div className="flex gap-6 mb-10 pb-10 border-b border-[#eee]">
        <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-6 w-20 rounded" />
            <Skeleton className="h-6 w-20 rounded" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        <div className="xl:col-span-8 space-y-10">
          <div className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-20 rounded" />
              ))}
            </div>
          </div>
        </div>
        <div className="xl:col-span-4 space-y-8">
          <Skeleton className="h-3 w-24" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-1 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
