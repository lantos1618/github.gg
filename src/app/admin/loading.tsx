export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto space-y-6">
        <h1 className="text-[31px] font-semibold text-[#111]">Admin</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border border-[#eee] rounded-lg">
              <div className="animate-pulse rounded-md bg-gray-200 h-3 w-20 mb-3" />
              <div className="animate-pulse rounded-md bg-gray-200 h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-[#f0f0f0]">
              <div className="animate-pulse rounded-full bg-gray-200 h-8 w-8" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-32" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-20 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
