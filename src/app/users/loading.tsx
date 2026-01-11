import { Skeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <div className="min-h-screen bg-white pt-20 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16">
          <Skeleton className="h-12 w-72 mb-4" />
          <Skeleton className="h-6 w-[450px]" />
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
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="py-6 px-8 hidden lg:table-cell">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="py-6 px-8 hidden md:table-cell">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="py-6 px-8 text-center hidden xl:table-cell">
                  <Skeleton className="h-4 w-8 mx-auto" />
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
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </td>
                  <td className="py-6 px-8 hidden lg:table-cell">
                    <Skeleton className="h-4 w-full max-w-xl" />
                    <Skeleton className="h-4 w-3/4 mt-1" />
                  </td>
                  <td className="py-6 px-8 hidden md:table-cell">
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 rounded-md" />
                      <Skeleton className="h-6 w-14 rounded-md" />
                      <Skeleton className="h-6 w-12 rounded-md" />
                    </div>
                  </td>
                  <td className="py-6 px-8 text-center hidden xl:table-cell">
                    <Skeleton className="h-5 w-12 mx-auto" />
                  </td>
                  <td className="py-6 px-8 text-center">
                    <Skeleton className="h-6 w-14 mx-auto" />
                  </td>
                  <td className="py-6 pl-8 text-right hidden sm:table-cell">
                    <Skeleton className="h-4 w-24 ml-auto" />
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
