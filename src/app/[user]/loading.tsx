import { Skeleton } from '@/components/ui/skeleton';

export default function UserLoading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header Skeleton */}
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            {/* Avatar */}
            <Skeleton className="h-32 w-32 rounded-full flex-shrink-0" />

            <div className="flex-1 space-y-4">
              {/* Name */}
              <Skeleton className="h-8 w-48" />
              {/* Username */}
              <Skeleton className="h-5 w-32" />
              {/* Bio */}
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-3/4 max-w-md" />

              {/* Stats row */}
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>

          {/* Content Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section header */}
              <Skeleton className="h-6 w-40" />

              {/* Cards */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-xl p-6 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="border rounded-xl p-6 space-y-4">
                <Skeleton className="h-5 w-32" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </div>

              <div className="border rounded-xl p-6 space-y-4">
                <Skeleton className="h-5 w-24" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-6 w-16 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
