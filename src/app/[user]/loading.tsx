export default function UserLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="animate-pulse rounded-full bg-gray-200 h-20 w-20" />
          <div className="space-y-2">
            <div className="animate-pulse rounded-md bg-gray-200 h-6 w-40" />
            <div className="animate-pulse rounded-md bg-gray-200 h-4 w-24" />
          </div>
        </div>
        <div className="space-y-3 mt-8">
          <div className="animate-pulse rounded-md bg-gray-200 h-4 w-full" />
          <div className="animate-pulse rounded-md bg-gray-200 h-4 w-3/4" />
          <div className="animate-pulse rounded-md bg-gray-200 h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}
