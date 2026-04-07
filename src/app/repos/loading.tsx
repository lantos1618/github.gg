export default function ReposLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">
            Repositories
          </h1>
          <div className="w-64 border-b-2 border-[#ddd] pb-1">
            <span className="text-base text-[#ccc]">Search repositories...</span>
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-[#f0f0f0]">
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-48" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-16 hidden lg:block" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-10 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
