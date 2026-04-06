# Loading Architecture — Full Fix

## The real problem

We show grey bars instead of content. The skeleton system is a symptom — the disease is client-side data fetching on pages that should server-render.

**Two layers to fix:**
1. **Eliminate loading states** — move data fetching server-side so pages render with content (no skeleton needed)
2. **Boneyard for the rest** — genuinely dynamic client sections get pixel-perfect skeletons

---

## Layer 1: Eliminate loading states via SSR

These components fetch PUBLIC data client-side, causing unnecessary loading states.
Move the fetch to the server `page.tsx`, pass as `initialData`, skeleton disappears.

### ELIMINABLE (skeleton goes away entirely)

| Component | Current client fetch | Fix | Impact |
|-----------|---------------------|-----|--------|
| `ResourceListView.tsx` | `trpc.githubAnalysis.getRepoPRs` | Fetch in `[user]/[[...params]]/page.tsx`, pass as prop | PR/Issue list loads instantly |
| `hire/search/page.tsx` | `trpc.profile.searchProfiles` | Split into server page.tsx + client SearchView. Server fetches default results, client handles filters | Initial search results load instantly |

### REDUCIBLE (some skeletons eliminated, interactive parts remain)

| Component | What moves server-side | What stays client | Impact |
|-----------|----------------------|-------------------|--------|
| `DiagramClientView.tsx` | `publicGetDiagram` (already public) | `useRepoData`, `usePlan`, version switching | Diagram loads with page instead of blank → loading → content |
| `ResourceDetailView.tsx` | PR/Issue details + cached analysis | Live "Analyze" subscription (user-initiated) | Detail view loads instantly, only analysis button is dynamic |
| `AdminDashboard.tsx` | `getUsageStats`, `getSubscriptionStats`, `getAllUsers`, `getDailyStats` | Profile generation (user action) | Admin page loads with data, no stat card skeletons |

### NECESSARY (must stay client-side)

| Component | Why | Pattern |
|-----------|-----|---------|
| `hire/match/page.tsx` | User types job description, clicks match — 30-60s AI job | Boneyard wrapper |
| `install/callback/page.tsx` | OAuth callback, reads URL params client-side | Boneyard wrapper |
| `ProfileEmptyState.tsx` | Shows during user-initiated profile generation (SSE) | Boneyard wrapper |
| `PricingCardActions.tsx` | Needs real-time session state for checkout | Boneyard wrapper |
| `AnalysisStateHandler.tsx` | Presentational state handler, receives loading from parent | Boneyard wrapper |
| `GitHubDashboard.tsx` (PRs/Issues) | Auth-gated, user-specific — already has boneyard | Already done |
| `ActivityFeed.tsx` | Auth-gated, user-specific — already has boneyard | Already done |
| `RepositoryListSidebar.tsx` | Auth-gated, user-specific — already has boneyard | Already done |

---

## Layer 2: Boneyard for remaining client loading states

After Layer 1, only genuinely dynamic states need skeletons. Convert all of these to boneyard wrappers.

### Already using boneyard (6 skeletons, done)

- `DeveloperProfile.tsx` → `profile-content`
- `GitHubDashboard.tsx` → `dashboard-prs`, `dashboard-issues`
- `DiscoverPage.tsx` → `discover-network`
- `RepositoryListSidebar.tsx` → `repo-list-sidebar`
- `ActivityFeed.tsx` → `activity-feed`

### Need boneyard wrappers (convert from old skeleton)

| File | Loading boolean | Boneyard name |
|------|----------------|---------------|
| `DiagramClientView.tsx` | Remaining client-side loads after SSR fix | `diagram-view` |
| `AnalysisStateHandler.tsx` | `state === 'loading'` | `analysis-content` |
| `ResourceDetailView.tsx` | Remaining: analysis subscription | `resource-detail` |
| `PricingCardActions.tsx` | `isLoading` | `pricing-action` |
| `hire/match/page.tsx` | `matchMutation.isPending` | `hire-match-results` |
| `install/callback/page.tsx` | Suspense loading | `install-callback` |
| `ProfileEmptyState.tsx` | `isGenerating` | `profile-generating` |
| `AdminDashboard.tsx` | Remaining after SSR fix | `admin-dashboard` |

### Dynamic imports — wrap at usage site, not in `dynamic()`

```tsx
// BEFORE (wrong — old skeleton in dynamic callback, boneyard can't help)
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <Skeleton className="h-[300px]" />
});

// AFTER (right — boneyard wraps the usage, dynamic has no loading callback)
const Chart = dynamic(() => import('./Chart'), { ssr: false });
// In render:
<Skeleton name="score-chart" loading={!data}>
  <Chart data={data} />
</Skeleton>
```

| File | Dynamic component | Boneyard name |
|------|-------------------|---------------|
| `HomeDashboard.tsx` | `GitHubDashboard` | `github-dashboard` |
| `ProfileSidebar.tsx` | `ScoreHistory` | `score-history` |
| `DiagramPreview.tsx` | `MermaidRenderer` | `diagram-preview` |
| `WikiEditor.tsx` | `MilkdownEditor` | `wiki-editor` |

---

## Layer 3: Cleanup

### Delete dead skeleton components
Once their consumers use boneyard:
- `src/components/RepoSkeleton.tsx`
- `src/components/RepoHeaderSkeleton.tsx`
- `src/components/FileListSkeleton.tsx`

### Kill `@/components/ui/skeleton.tsx`
After all client files migrated:
1. Update 8 `loading.tsx` to use inline `<div className="animate-pulse rounded-md bg-gray-200 ...">` (3-5 lines each)
2. Delete `src/components/ui/skeleton.tsx`

### Rebuild bones
1. Update `boneyard-preview/page.tsx` with all new named skeletons (~16 total)
2. `npm run bones` to capture at 6 breakpoints
3. Registry auto-updates

---

## Execution order

```
Phase 1: SSR/ISR — eliminate loading states at source
  1a. hire/search → server component with initial results
  1b. DiagramClientView → pass publicGetDiagram from page.tsx as initialData
  1c. ResourceListView → pass PR/Issue list from page.tsx
  1d. ResourceDetailView → pass detail + cached analysis from page.tsx
  1e. AdminDashboard → pass stats from admin/page.tsx

Phase 2: Boneyard — wrap remaining client loading states
  2a. Convert ~8 inline skeleton files to boneyard wrappers
  2b. Convert 4 dynamic imports to boneyard-at-usage-site pattern
  2c. Add all new skeletons to boneyard-preview page

Phase 3: Cleanup
  3a. Delete standalone skeleton components (3 files)
  3b. Inline loading.tsx bars (remove @/components/ui/skeleton import)
  3c. Delete @/components/ui/skeleton.tsx
  3d. Rebuild bones (npm run bones)
  3e. Verify build, push
```

---

## What stays unchanged

- **8 loading.tsx files** — Simple server-rendered HTML divs. No JS, instant paint. These are only seen on ISR cache miss or first navigation. Not worth making client components for boneyard.
- **Boneyard config** — Already in root layout via `@/lib/boneyard-config.tsx`.
- **ISR on repos/users/hire** — Already added (`revalidate = 300/600`).
- **Wiki pages** — Already have 1-hour ISR with server-side data fetching.
