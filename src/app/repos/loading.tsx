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
        <table className="w-full text-base border-collapse table-fixed">
          <thead>
            <tr className="border-b border-[#ddd]">
              <td className="w-[60%] py-2 text-xs text-[#999] font-semibold">Repository</td>
              <td className="w-[15%] py-2 text-xs text-[#999] font-semibold text-center hidden lg:table-cell">Score</td>
              <td className="w-[25%] py-2 text-xs text-[#999] font-semibold text-right hidden sm:table-cell">Analyzed</td>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-[#f0f0f0]">
                <td className="py-3">
                  <div className="animate-pulse rounded-md bg-gray-200 h-4 w-48" />
                </td>
                <td className="py-3 hidden lg:table-cell">
                  <div className="animate-pulse rounded-md bg-gray-200 h-4 w-16 mx-auto" />
                </td>
                <td className="py-3 hidden sm:table-cell">
                  <div className="animate-pulse rounded-md bg-gray-200 h-4 w-20 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
