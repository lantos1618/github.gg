import { Skeleton } from '@/components/ui/skeleton';

export default function ReposLoading() {
  return (
    <div className="w-[90%] max-w-[800px] mx-auto py-12">
      <Skeleton className="h-3 w-16 mb-3" />
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-80 mb-8" />
      <Skeleton className="h-10 w-full max-w-md mb-8" />

      <div className="space-y-0">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-[#f0f0f0]">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
