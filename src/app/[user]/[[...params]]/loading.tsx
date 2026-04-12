'use client';

import { PageWidthContainer } from '@/components/PageWidthContainer';

export default function RepoLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <PageWidthContainer className="space-y-6">
        <div className="animate-pulse rounded-md bg-gray-200 h-8 w-64" />
        <div className="animate-pulse rounded-md bg-gray-200 h-4 w-32" />
        <div className="flex gap-6 mt-8">
          <div className="w-48 space-y-3 hidden md:block">
            <div className="animate-pulse rounded-md bg-gray-200 h-6 w-full" />
            <div className="animate-pulse rounded-md bg-gray-200 h-6 w-full" />
            <div className="animate-pulse rounded-md bg-gray-200 h-6 w-full" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
            <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
            <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
            <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
          </div>
        </div>
      </PageWidthContainer>
    </div>
  );
}
