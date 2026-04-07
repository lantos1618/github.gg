export default function UserLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-[900px] mx-auto space-y-8">
        <div className="flex gap-6 sm:gap-8">
          <div className="animate-pulse rounded-full bg-gray-200 h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0" />
          <div className="space-y-2 pt-2">
            <div className="animate-pulse rounded-md bg-gray-200 h-8 w-48" />
            <div className="animate-pulse rounded-md bg-gray-200 h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          <div className="xl:col-span-8 space-y-8">
            <div className="space-y-3">
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-full" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-5/6" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-4/6" />
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-md bg-gray-200 h-5 w-20" />
              ))}
            </div>
          </div>
          <div className="xl:col-span-4 space-y-8 min-h-[500px]">
            <div className="animate-pulse rounded-md bg-gray-200 h-[180px] w-full" />
            <div className="animate-pulse rounded-md bg-gray-200 h-[140px] w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
