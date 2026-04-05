'use client';

import { Skeleton } from 'boneyard-js/react';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <Skeleton
          name="admin-dashboard"
          loading={true}
          fallback={
            <div className="space-y-6">
              <div className="animate-pulse rounded-md bg-gray-200 h-8 w-48" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="animate-pulse rounded-md bg-gray-200 h-24 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-24 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-24 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-24 w-full" />
              </div>
              <div className="space-y-3 mt-6">
                <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
              </div>
            </div>
          }
          fixture={
            <div className="space-y-6">
              <div className="h-8 w-48 bg-gray-200 rounded" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 border border-gray-200 rounded-lg">
                    <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-[#f0f0f0]">
                    <div className="h-8 w-8 rounded-full bg-gray-200" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
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
