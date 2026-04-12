'use client';

import { PageWidthContainer } from '@/components/PageWidthContainer';

export default function WikiPageLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <PageWidthContainer className="space-y-6">
        <div className="animate-pulse rounded-md bg-gray-200 h-8 w-64" />
        <div className="animate-pulse rounded-md bg-gray-200 h-4 w-40" />
        <div className="space-y-3 mt-8">
          <div className="animate-pulse rounded-md bg-gray-200 h-4 w-full" />
          <div className="animate-pulse rounded-md bg-gray-200 h-4 w-full" />
          <div className="animate-pulse rounded-md bg-gray-200 h-4 w-3/4" />
          <div className="animate-pulse rounded-md bg-gray-200 h-4 w-5/6" />
        </div>
      </PageWidthContainer>
    </div>
  );
}
