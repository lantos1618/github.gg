'use client';

import { Skeleton } from 'boneyard-js/react';

export default function WikiPageLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <Skeleton
          name="wiki-page"
          loading={true}
          fallback={
            <div className="space-y-6">
              <div className="animate-pulse rounded-md bg-gray-200 h-8 w-64" />
              <div className="animate-pulse rounded-md bg-gray-200 h-4 w-40" />
              <div className="space-y-3 mt-8">
                <div className="animate-pulse rounded-md bg-gray-200 h-4 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-4 w-full" />
                <div className="animate-pulse rounded-md bg-gray-200 h-4 w-3/4" />
                <div className="animate-pulse rounded-md bg-gray-200 h-4 w-5/6" />
              </div>
            </div>
          }
          fixture={
            <div className="space-y-6">
              <div className="h-8 w-64 bg-gray-200 rounded" />
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="prose max-w-none space-y-4 mt-6">
                <div className="h-6 w-48 bg-gray-200 rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-5/6 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-40 bg-gray-200 rounded mt-6" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
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
