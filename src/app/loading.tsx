import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Hero Section Skeleton */}
      <div className="relative bg-white overflow-hidden min-h-[80vh] flex flex-col justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Main heading skeleton */}
            <Skeleton className="h-24 md:h-32 w-3/4 mx-auto" />

            {/* Subheading skeleton */}
            <Skeleton className="h-6 w-2/3 mx-auto" />

            {/* Search input skeleton */}
            <div className="max-w-xl mx-auto">
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>

            {/* Try buttons skeleton */}
            <div className="flex justify-center gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
