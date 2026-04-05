import { Skeleton } from '@/components/ui/skeleton';

export default function RepoLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-6 mt-8">
          <div className="w-48 space-y-3 hidden md:block">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
