import { Skeleton } from '@/components/ui/skeleton';

export default function RepoLoading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background flex">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r bg-background p-3 space-y-3 hidden lg:block">
        {/* Repo name */}
        <div className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="border-t border-gray-200" />
        {/* Nav items */}
        <div className="space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200" />
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-6 space-y-4">
        {/* File tree header */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        {/* File list */}
        <div className="border rounded-lg">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4" style={{ width: `${30 + Math.random() * 40}%` }} />
              <Skeleton className="h-3 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
