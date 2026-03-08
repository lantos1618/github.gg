import { Skeleton } from '@/components/ui/skeleton';

export default function ReposLoading() {
  return (
    <div className="min-h-screen bg-white pt-20 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <Skeleton className="h-12 w-80 mb-4" />
          <Skeleton className="h-6 w-[500px]" />
        </div>

        {/* Search Control */}
        <div className="mb-12">
          <Skeleton className="h-14 w-full max-w-xl rounded-xl" />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-6 pr-8">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="py-6 px-8 hidden lg:table-cell">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="py-6 px-8 text-center">
                  <Skeleton className="h-4 w-12 mx-auto" />
                </th>
                <th className="py-6 pl-8 text-right hidden sm:table-cell">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <tr key={i}>
                  <td className="py-6 pr-8">
                    <Skeleton className="h-5 w-48 mb-1" />
                  </td>
                  <td className="py-6 px-8 hidden lg:table-cell">
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-24 rounded-md" />
                      <Skeleton className="h-6 w-20 rounded-md" />
                      <Skeleton className="h-6 w-16 rounded-md" />
                    </div>
                  </td>
                  <td className="py-6 px-8 text-center">
                    <Skeleton className="h-6 w-14 mx-auto" />
                  </td>
                  <td className="py-6 pl-8 text-right hidden sm:table-cell">
                    <Skeleton className="h-4 w-24 ml-auto mb-1" />
                    <Skeleton className="h-3 w-8 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
