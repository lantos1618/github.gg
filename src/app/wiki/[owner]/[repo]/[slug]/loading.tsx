import { Skeleton } from '@/components/ui/skeleton';

export default function WikiPageLoading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-5 w-20" />
            <span className="text-muted-foreground">/</span>
            <Skeleton className="h-5 w-24" />
            <span className="text-muted-foreground">/</span>
            <Skeleton className="h-5 w-16" />
            <span className="text-muted-foreground">/</span>
            <Skeleton className="h-5 w-32" />
          </div>

          {/* Title and meta */}
          <div className="mb-8">
            <Skeleton className="h-10 w-2/3 mb-3" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Article content skeleton */}
          <article className="prose prose-lg max-w-none space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />

            <Skeleton className="h-6 w-1/4 mt-8" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />

            {/* Code block skeleton */}
            <div className="bg-muted rounded-lg p-4 space-y-2 my-6">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-4/5" />
            </div>

            <Skeleton className="h-6 w-1/3 mt-8" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </article>
        </div>
      </div>
    </div>
  );
}
