'use client';

import { Skeleton } from 'boneyard-js/react';

export default function ReposLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto">
        <Skeleton
          name="repos-list"
          loading={true}
          fallback={
            <div className="space-y-6">
              <div className="animate-pulse rounded-md bg-gray-200 h-8 w-48" />
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
              <div className="flex items-end justify-between">
                <div>
                  <div className="h-8 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded mt-2" />
                </div>
                <div className="h-10 w-48 bg-gray-200 rounded" />
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-[#ddd]">
                  {['Repository', 'Language', 'Stars', 'Score'].map(h => (
                    <td key={h} className="py-2"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
                  ))}
                </tr></thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#f0f0f0]">
                      <td className="py-3"><div className="h-4 w-40 bg-gray-200 rounded" /></td>
                      <td className="py-3"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                      <td className="py-3"><div className="h-4 w-12 bg-gray-200 rounded" /></td>
                      <td className="py-3"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        >
          <div />
        </Skeleton>
      </div>
    </div>
  );
}
