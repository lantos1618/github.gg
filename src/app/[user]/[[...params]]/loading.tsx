import { Skeleton } from '@/components/ui/skeleton';

export default function RepoLoading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar skeleton */}
        <div className="w-64 border-r bg-background p-4 space-y-4 hidden lg:block">
          <Skeleton className="h-8 w-full" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-5 w-24" />
            <span className="text-muted-foreground">/</span>
            <Skeleton className="h-5 w-32" />
          </div>

          {/* File header */}
          <div className="border rounded-lg mb-4">
            <div className="p-4 border-b flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>

            {/* Code content skeleton */}
            <div className="p-4 space-y-2">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-8 flex-shrink-0" />
                  <Skeleton
                    className="h-4 flex-1"
                    style={{ width: `${Math.random() * 60 + 20}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
