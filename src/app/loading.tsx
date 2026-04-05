'use client';

import { Skeleton } from 'boneyard-js/react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <Skeleton
          name="home-page"
          loading={true}
          fallback={
            <div className="space-y-6">
              <div className="animate-pulse rounded-md bg-gray-200 h-8 w-48" />
              <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full max-w-md" />
              <div className="space-y-3 mt-8">
                <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
              </div>
            </div>
          }
          fixture={
            <div className="space-y-6">
              <div className="h-10 w-64 bg-gray-200 rounded" />
              <div className="h-5 w-96 bg-gray-200 rounded" />
              <div className="grid grid-cols-3 gap-6 mt-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 bg-gray-200 rounded-lg" />
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
