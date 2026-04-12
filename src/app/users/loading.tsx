'use client';

import { TablePageSkeleton } from '@/components/skeletons/TablePageSkeleton';

export default function UsersLoading() {
  return (
    <TablePageSkeleton
      title="Profiles"
      searchPlaceholder="Search username..."
      columns={[
        { label: 'Developer', width: 'w-[40%]', sortable: true },
        { label: 'Summary', width: 'w-[35%]', hidden: 'hidden lg:table-cell' },
        { label: 'Score', width: 'w-[12%]', align: 'center', sortable: true },
        { label: 'Analyzed', width: 'w-[13%]', align: 'right', hidden: 'hidden sm:table-cell', defaultSort: true },
      ]}
      renderRow={(i) => (
        <>
          <td className="py-3">
            <div className="flex items-center gap-3">
              <div className="animate-pulse rounded-full bg-gray-200 h-8 w-8 flex-shrink-0" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4" style={{ width: `${40 - (i % 4) * 6}%` }} />
            </div>
          </td>
          <td className="py-3 hidden lg:table-cell">
            <div className="animate-pulse rounded-md bg-gray-200 h-4 w-full" />
          </td>
          <td className="py-3 text-center">
            <div className="animate-pulse rounded-md bg-gray-200 h-4 w-12 mx-auto" />
          </td>
          <td className="py-3 text-right hidden sm:table-cell">
            <div className="animate-pulse rounded-md bg-gray-200 h-4 w-20 ml-auto" />
          </td>
        </>
      )}
    />
  );
}
