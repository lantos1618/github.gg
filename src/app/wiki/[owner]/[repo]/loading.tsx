'use client';

import { Skeleton } from 'boneyard-js/react';

export default function WikiLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <Skeleton
          name="wiki-index"
          loading={true}
          fallback={
            <div className="space-y-6">
              <div className="animate-pulse rounded-md bg-gray-200 h-8 w-56" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-32" />
              <div className="space-y-3 mt-8">
                <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
              </div>
            </div>
          }
          fixture={
            <div className="space-y-6">
              <div className="h-8 w-56 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="space-y-2 mt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f0f0f0]">
                    <div className="h-4 w-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded" style={{ width: `${30 + (i * 11) % 40}%` }} />
                    <div className="h-3 w-20 bg-gray-100 rounded ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <div />
        </Skeleton>
      </div>
    </div>
  );
}
