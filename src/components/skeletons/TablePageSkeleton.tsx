'use client';

import { PageWidthContainer } from '@/components/PageWidthContainer';
import { ArrowUpDown } from 'lucide-react';

interface Column {
  label: string;
  width: string;
  align?: 'left' | 'center' | 'right';
  hidden?: string; // e.g. "hidden lg:table-cell"
  defaultSort?: boolean; // show sort icon visibly (default sorted column)
  sortable?: boolean; // reserve space for sort icon (invisible until active)
}

function SearchInput({ placeholder }: { placeholder: string }) {
  return (
    <div className="group relative w-64 flex-shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ccc]" aria-hidden="true"><path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" /></svg>
      <input
        disabled
        type="text"
        placeholder={placeholder}
        className="flex h-10 w-full bg-transparent border-0 border-b-2 border-[#ddd] px-0 py-2 text-base text-[#111] placeholder:text-[#ccc] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 pl-6"
      />
    </div>
  );
}

function Pagination() {
  return (
    <div className="mt-8 flex items-center justify-center gap-4">
      <div className="px-3 py-1.5 text-base font-medium text-[#666] border border-[#ddd] rounded opacity-30">Previous</div>
      <span className="text-base text-[#aaa] font-mono">{`1 / \u2014`}</span>
      <div className="px-3 py-1.5 text-base font-medium text-[#666] border border-[#ddd] rounded">Next</div>
    </div>
  );
}

export function TablePageSkeleton({
  title,
  searchPlaceholder,
  columns,
  rowCount = 20,
  renderRow,
}: {
  title: string;
  searchPlaceholder: string;
  columns: Column[];
  rowCount?: number;
  renderRow: (index: number) => React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <PageWidthContainer>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">
              {title}
              <span className="text-base font-normal text-[#888] ml-3">
                <span className="inline-block animate-pulse rounded-md bg-gray-200 h-4 w-8 align-middle" />
              </span>
            </h1>
          </div>
          <SearchInput placeholder={searchPlaceholder} />
        </div>
        <table className="w-full text-base border-collapse table-fixed">
          <thead>
            <tr className="border-b border-[#ddd]">
              {columns.map((col) => (
                <td
                  key={col.label}
                  className={`${col.width} py-2 text-xs text-[#999] font-semibold ${col.sortable || col.defaultSort ? 'cursor-pointer hover:text-[#111] transition-colors' : ''} ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''} ${col.hidden || ''}`}
                >
                  {col.sortable || col.defaultSort ? (
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className={`h-3 w-3 ${!col.defaultSort ? 'invisible' : ''}`} />
                    </span>
                  ) : (
                    col.label
                  )}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i} className="border-b border-[#f0f0f0]">
                {renderRow(i)}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination />
      </PageWidthContainer>
    </div>
  );
}
