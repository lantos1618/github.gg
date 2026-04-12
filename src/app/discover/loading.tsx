'use client';

import { PageWidthContainer } from '@/components/PageWidthContainer';

export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <PageWidthContainer>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">Discover</h1>
          </div>
          <div className="flex items-end gap-6 flex-shrink-0">
            <div className="w-48 border-b-2 border-[#ddd] pb-1">
              <span className="text-base text-[#ccc]">e.g. torvalds, antfu</span>
            </div>
            <span className="text-base font-medium text-[#111] pb-1">My Network</span>
            <span className="text-base font-medium text-[#888] pb-1">Explore All</span>
          </div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="animate-pulse rounded-md bg-gray-200 h-4 w-48" />
          <div className="flex gap-4">
            <span className="pb-1 text-xs font-semibold tracking-[1px] uppercase text-[#888]">Table</span>
            <span className="pb-1 text-xs font-semibold tracking-[1px] uppercase text-[#111]">Graph</span>
          </div>
        </div>
        <div className="animate-pulse rounded-lg bg-gray-100 w-full" style={{ height: 500 }} />
      </PageWidthContainer>
    </div>
  );
}
