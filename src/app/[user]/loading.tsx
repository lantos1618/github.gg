'use client';

import { Skeleton } from 'boneyard-js/react';

export default function UserLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <Skeleton
          name="user-profile"
          loading={true}
          fallback={
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="animate-pulse rounded-full bg-gray-200 h-20 w-20" />
                <div className="space-y-2">
                  <div className="animate-pulse rounded-md bg-gray-200 h-6 w-40" />
                  <div className="animate-pulse rounded-md bg-gray-200 h-4 w-24" />
                </div>
              </div>
              <div className="space-y-3 mt-8">
                <div className="animate-pulse rounded-md bg-gray-200 h-4 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-4 w-3/4" />
                <div className="animate-pulse rounded-md bg-gray-200 h-4 w-5/6" />
              </div>
            </div>
          }
          fixture={
            <div className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-full bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-7 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="border-t border-[#eee] pt-8 grid grid-cols-1 xl:grid-cols-12 gap-12">
                <div className="xl:col-span-8 space-y-8">
                  <div className="space-y-3">
                    <div className="h-3 w-32 bg-gray-200 rounded" />
                    <div className="h-4 w-full bg-gray-200 rounded" />
                    <div className="h-4 w-5/6 bg-gray-200 rounded" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-40 bg-gray-200 rounded" />
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-8 w-20 bg-gray-200 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="xl:col-span-4 space-y-8">
                  <div className="h-[180px] w-full bg-gray-200 rounded" />
                  <div className="h-[140px] w-full bg-gray-200 rounded" />
                </div>
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
