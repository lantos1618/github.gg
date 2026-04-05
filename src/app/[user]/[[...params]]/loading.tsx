'use client';

import { Skeleton } from 'boneyard-js/react';

export default function RepoLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <Skeleton
          name="repo-page"
          loading={true}
          fallback={
            <div className="space-y-6">
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
            </div>
          }
          fixture={
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-gray-200" />
                <div className="h-8 w-64 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-96 bg-gray-200 rounded" />
              <div className="flex gap-3 border-b border-[#eee] pb-3">
                {['Code', 'Diagram', 'Wiki', 'Analysis'].map(tab => (
                  <div key={tab} className="h-8 w-20 bg-gray-200 rounded" />
                ))}
              </div>
              <div className="flex gap-6">
                <div className="w-48 space-y-2 hidden md:block">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <div className="h-4 w-4 bg-gray-200 rounded" />
                      <div className="h-4 bg-gray-200 rounded" style={{ width: `${40 + (i * 11) % 50}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex-1 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-[#f0f0f0]">
                      <div className="h-4 w-4 bg-gray-200 rounded" />
                      <div className="h-4 bg-gray-200 rounded" style={{ width: `${30 + (i * 13) % 50}%` }} />
                      <div className="h-3 w-16 bg-gray-100 rounded ml-auto" />
                    </div>
                  ))}
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
