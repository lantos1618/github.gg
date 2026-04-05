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
                    <div className="w-4 h-4 mt-0.5 rounded-full bg-purple-200 shrink-0" />
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

      {/* Discover Network */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">discover-network</h2>
        <Skeleton
          name="discover-network"
          loading={false}
          fixture={
            <div className="py-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-5 w-64 bg-gray-200 rounded" />
                <div className="flex gap-1">
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#ddd]">
                    {['Developer', 'Bio', 'Repos', 'Followers', 'GG'].map(h => (
                      <td key={h} className="py-2"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#f0f0f0]">
                      <td className="py-2"><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-gray-200" /><div className="h-4 w-24 bg-gray-200 rounded" /></div></td>
                      <td className="py-2"><div className="h-4 w-40 bg-gray-200 rounded" /></td>
                      <td className="py-2 text-center"><div className="h-4 w-8 bg-gray-200 rounded mx-auto" /></td>
                      <td className="py-2 text-center"><div className="h-4 w-12 bg-gray-200 rounded mx-auto" /></td>
                      <td className="py-2 text-center"><div className="h-4 w-8 bg-gray-200 rounded mx-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        >
          <div className="text-sm text-gray-400">Network table renders here</div>
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

      {/* ── Route loading states ── */}

      {/* Home Page */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">home-page</h2>
        <Skeleton
          name="home-page"
          loading={false}
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
          <div className="text-sm text-gray-400">Home page</div>
        </Skeleton>
      </section>

      {/* User Profile Page */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">user-profile</h2>
        <Skeleton
          name="user-profile"
          loading={false}
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
          <div className="text-sm text-gray-400">User profile page</div>
        </Skeleton>
      </section>

      {/* Repo Page */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">repo-page</h2>
        <Skeleton
          name="repo-page"
          loading={false}
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
          <div className="text-sm text-gray-400">Repo page</div>
        </Skeleton>
      </section>

      {/* Repos List */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">repos-list</h2>
        <Skeleton
          name="repos-list"
          loading={false}
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
          <div className="text-sm text-gray-400">Repos list page</div>
        </Skeleton>
      </section>

      {/* Users List */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">users-list</h2>
        <Skeleton
          name="users-list"
          loading={false}
          fixture={
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <div className="h-8 w-40 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded mt-2" />
                </div>
                <div className="h-10 w-48 bg-gray-200 rounded" />
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-[#ddd]">
                  {['Developer', 'Bio', 'Repos', 'Followers'].map(h => (
                    <td key={h} className="py-2"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
                  ))}
                </tr></thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#f0f0f0]">
                      <td className="py-3"><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-gray-200" /><div className="h-4 w-28 bg-gray-200 rounded" /></div></td>
                      <td className="py-3"><div className="h-4 w-40 bg-gray-200 rounded" /></td>
                      <td className="py-3 text-center"><div className="h-4 w-8 bg-gray-200 rounded mx-auto" /></td>
                      <td className="py-3 text-center"><div className="h-4 w-12 bg-gray-200 rounded mx-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        >
          <div className="text-sm text-gray-400">Users list page</div>
        </Skeleton>
      </section>

      {/* Admin Dashboard */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">admin-dashboard</h2>
        <Skeleton
          name="admin-dashboard"
          loading={false}
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
          <div className="text-sm text-gray-400">Admin dashboard</div>
        </Skeleton>
      </section>

      {/* Wiki Index */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">wiki-index</h2>
        <Skeleton
          name="wiki-index"
          loading={false}
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
          <div className="text-sm text-gray-400">Wiki index</div>
        </Skeleton>
      </section>

      {/* Wiki Page */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">wiki-page</h2>
        <Skeleton
          name="wiki-page"
          loading={false}
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
          <div className="text-sm text-gray-400">Wiki page</div>
        </Skeleton>
      </section>
    </div>
  );
}
