import { Skeleton } from '@/components/ui/skeleton';

export default function RepoLoading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white flex">
      {/* Sidebar skeleton — matches w-60 from RepoSidebar */}
      <div className="w-60 border-r border-[#eee] p-3 space-y-3 hidden lg:block">
        <div className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="border-t border-[#eee]" />
        <div className="space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="border-t border-[#eee]" />
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Main content skeleton — matches RepoSkeleton layout */}
      <div className="flex-1 p-6">
        <div className="w-[90%] max-w-[1100px] mx-auto pt-2">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-64 mb-2" />
          <div className="flex items-center gap-4 mt-2 mb-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f0f0f0]">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4" style={{ width: `${20 + i * 7}%` }} />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
