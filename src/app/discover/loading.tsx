export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">Discover</h1>
          <div className="flex items-end gap-6 flex-shrink-0">
            <div className="w-48 border-b-2 border-[#ddd] pb-1">
              <span className="text-base text-[#ccc]">e.g. torvalds, antfu</span>
            </div>
            <span className="text-base font-medium text-[#111] pb-1">Following</span>
            <span className="text-base font-medium text-[#888] pb-1">Followers</span>
          </div>
        </div>
        <div className="space-y-3 mt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-[#f0f0f0]">
              <div className="animate-pulse rounded-full bg-gray-200 h-6 w-6 flex-shrink-0" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-24" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-40 hidden lg:block" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-8 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
