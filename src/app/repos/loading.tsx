'use client';

import { TablePageSkeleton } from '@/components/skeletons/TablePageSkeleton';

export default function ReposLoading() {
  return (
    <TablePageSkeleton
      title="Repositories"
      searchPlaceholder="Search repositories..."
      columns={[
        { label: 'Repository', width: 'w-[60%]', sortable: true },
        { label: 'Score', width: 'w-[15%]', align: 'center', hidden: 'hidden lg:table-cell', sortable: true },
        { label: 'Analyzed', width: 'w-[25%]', align: 'right', hidden: 'hidden sm:table-cell', defaultSort: true },
      ]}
      renderRow={(i) => (
        <>
          <td className="py-3">
            <div className="animate-pulse rounded-md bg-gray-200 h-4" style={{ width: `${55 - (i % 5) * 8}%` }} />
          </td>
          <td className="py-3 text-center hidden lg:table-cell">
            <div className="animate-pulse rounded-md bg-gray-200 h-4 w-12 mx-auto" />
          </td>
          <td className="py-3 text-right hidden sm:table-cell">
            <div className="animate-pulse rounded-md bg-gray-200 h-4 w-24 ml-auto" />
          </td>
        </>
      )}
    />
  );
}
