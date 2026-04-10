export default function UsersLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">
            Profiles
          </h1>
          <div className="w-64 border-b-2 border-[#ddd] pb-1">
            <span className="text-base text-[#ccc]">Search username...</span>
          </div>
        </div>
        <table className="w-full text-base border-collapse table-fixed">
          <thead>
            <tr className="border-b border-[#ddd]">
              <td className="w-[40%] py-2 text-xs text-[#999] font-semibold">Developer</td>
              <td className="w-[35%] py-2 text-xs text-[#999] font-semibold hidden lg:table-cell">Summary</td>
              <td className="w-[12%] py-2 text-xs text-[#999] font-semibold text-center">Score</td>
              <td className="w-[13%] py-2 text-xs text-[#999] font-semibold text-right hidden sm:table-cell">Analyzed</td>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-[#f0f0f0]">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse rounded-full bg-gray-200 h-8 w-8 flex-shrink-0" />
                    <div className="animate-pulse rounded-md bg-gray-200 h-4 w-28" />
                  </div>
                </td>
                <td className="py-3 hidden lg:table-cell">
                  <div className="animate-pulse rounded-md bg-gray-200 h-4 w-40" />
                </td>
                <td className="py-3">
                  <div className="animate-pulse rounded-md bg-gray-200 h-4 w-10 mx-auto" />
                </td>
                <td className="py-3 hidden sm:table-cell">
                  <div className="animate-pulse rounded-md bg-gray-200 h-4 w-16 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
