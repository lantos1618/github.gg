export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto space-y-6">
        <div className="animate-pulse rounded-md bg-gray-200 h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="animate-pulse rounded-md bg-gray-200 h-24 w-full" />
          <div className="animate-pulse rounded-md bg-gray-200 h-24 w-full" />
          <div className="animate-pulse rounded-md bg-gray-200 h-24 w-full" />
          <div className="animate-pulse rounded-md bg-gray-200 h-24 w-full" />
        </div>
        <div className="space-y-3 mt-6">
          <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
          <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
          <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
