'use client';

/**
 * Dev-only page for boneyard CLI to capture skeleton bones.
 * Run: npx boneyard-js build http://localhost:3000/boneyard-preview
 *
 * This page mounts all named <Skeleton> components with loading={false}
 * so boneyard can snapshot the fixture content at each breakpoint.
 */

import { Skeleton } from 'boneyard-js/react';

export default function BoneyardPreview() {
  return (
    <div className="space-y-20 p-8">
      {/* Profile Content */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">profile-content</h2>
        <Skeleton
          name="profile-content"
          loading={false}
          fixture={
            <div className="w-[90%] max-w-[900px] mx-auto py-12 space-y-12">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 border-b border-[#eee] pb-10">
                <div className="flex items-center gap-5">
                  <div className="h-20 w-20 rounded-full bg-gray-200" />
                  <div className="space-y-2">
                    <div className="h-7 w-48 bg-gray-200 rounded" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-28 bg-gray-200 rounded" />
                  <div className="h-10 w-28 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                <div className="xl:col-span-8 space-y-12">
                  <div className="space-y-3">
                    <div className="h-3 w-32 bg-gray-200 rounded" />
                    <div className="h-4 w-full bg-gray-200 rounded" />
                    <div className="h-4 w-5/6 bg-gray-200 rounded" />
                    <div className="h-4 w-4/6 bg-gray-200 rounded" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-40 bg-gray-200 rounded" />
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-8 w-20 bg-gray-200 rounded-full" />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-36 bg-gray-200 rounded" />
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 w-full bg-gray-200 rounded" />
                    ))}
                  </div>
                </div>
                <div className="xl:col-span-4 space-y-10">
                  <div className="h-[200px] w-full bg-gray-200 rounded" />
                  <div className="h-[160px] w-full bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          }
        >
          <div className="text-sm text-gray-400">Profile content renders here</div>
        </Skeleton>
      </section>

      {/* Dashboard PRs */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">dashboard-prs</h2>
        <Skeleton
          name="dashboard-prs"
          loading={false}
          fixture={
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 mt-0.5 rounded bg-green-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-24 bg-gray-100 rounded" />
                        <div className="h-4 w-16 bg-gray-100 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <div className="text-sm text-gray-400">PR list renders here</div>
        </Skeleton>
      </section>

      {/* Dashboard Issues */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">dashboard-issues</h2>
        <Skeleton
          name="dashboard-issues"
          loading={false}
          fixture={
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 mt-0.5 rounded-full bg-gray-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-24 bg-gray-100 rounded" />
                        <div className="h-4 w-16 bg-gray-100 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <div className="text-sm text-gray-400">Issues list renders here</div>
        </Skeleton>
      </section>

      {/* Repo List Sidebar */}
      <section className="max-w-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">repo-list-sidebar</h2>
        <Skeleton
          name="repo-list-sidebar"
          loading={false}
          fixture={
            <div className="space-y-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <div className="w-5 h-5 rounded-full bg-gray-200 shrink-0" />
                  <div className="h-4 bg-gray-200 rounded" style={{ width: `${50 + (i * 7) % 40}%` }} />
                </div>
              ))}
            </div>
          }
        >
          <div className="text-sm text-gray-400">Repo list renders here</div>
        </Skeleton>
      </section>

      {/* Activity Feed */}
      <section className="max-w-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">activity-feed</h2>
        <Skeleton
          name="activity-feed"
          loading={false}
          fixture={
            <div className="relative border-l border-border ml-2 space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="relative pl-5">
                  <div className="absolute left-[-4px] top-1.5 h-2 w-2 rounded-full bg-gray-300" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                    </div>
                    <div className="h-4 w-4/5 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <div className="text-sm text-gray-400">Activity feed renders here</div>
        </Skeleton>
      </section>

    </div>
  );
}
