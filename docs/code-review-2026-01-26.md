# GitHub.gg Codebase Review

**Date:** January 26, 2026
**Reviewer:** Claude Code (Opus 4.5)
**Files Analyzed:** 369 source files
**Total Lines:** ~25,000+ lines of TypeScript/TSX

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Database Schemas](#database-schemas)
4. [API Routes](#api-routes)
5. [tRPC Routes](#trpc-routes)
6. [AI Modules](#ai-modules)
7. [GitHub Integration](#github-integration)
8. [Utilities & Configuration](#utilities--configuration)
9. [React Components](#react-components)
10. [Pages & Layouts](#pages--layouts)
11. [Priority Recommendations](#priority-recommendations)

---

## Executive Summary

### Strengths
- **Well-organized codebase** with clear separation of concerns
- **Strong TypeScript usage** with strict mode enabled
- **Consistent patterns** for tRPC procedures and API routes
- **Good use of Zod** for input validation throughout
- **Effective streaming** for long-running AI operations with SSE
- **Centralized configuration** in `/lib/config/index.ts`

### Critical Issues
1. **Code duplication** across multiple files (retry logic, sanitization, stargazer checks)
2. **Large monolithic files** that need refactoring (DeveloperProfile.tsx: 800 lines, profile.ts: 1000+ lines)
3. **Inconsistent naming conventions** in database schemas (camelCase vs snake_case)
4. **Security concerns** with plaintext token storage and sync encryption
5. **Missing rate limiting** on public endpoints

### Key Metrics
| Metric | Count |
|--------|-------|
| Source Files | 369 |
| Database Tables | 40+ |
| API Routes | 17 |
| tRPC Procedures | 80+ |
| React Components | 112 |
| AI Model Integrations | 4 Gemini models |

---

## Architecture Overview

```
github.gg/
├── src/
│   ├── app/           # Next.js App Router (75 files)
│   │   ├── api/       # REST API routes (17 endpoints)
│   │   └── [routes]/  # Page components
│   ├── components/    # React components (149 files)
│   │   ├── ui/        # Base UI library (40 files)
│   │   ├── wrapped/   # GitHub Wrapped (16 files)
│   │   ├── profile/   # Developer profiles (12 files)
│   │   └── ...
│   ├── lib/           # Business logic (122 files)
│   │   ├── ai/        # AI integrations (13 files)
│   │   ├── github/    # GitHub API (14 files)
│   │   ├── trpc/      # tRPC routers (31 files)
│   │   └── utils/     # Utilities (12 files)
│   └── db/            # Database layer (17 files)
├── drizzle/           # Migrations (37 files)
└── tests/             # Test suites (10 files)
```

### Technology Stack
- **Frontend:** Next.js 16.1.1, React 19, Tailwind CSS 4
- **Backend:** tRPC 11.6.0, Drizzle ORM 0.44.6
- **Database:** PostgreSQL with pgvector
- **AI:** Google Gemini (gemini-3-pro-preview, gemini-2.5-flash)
- **Auth:** Better Auth 1.3.27 with GitHub OAuth

---

## Database Schemas

### Summary by Domain

| Domain | Tables | Key Purpose |
|--------|--------|-------------|
| Auth | 4 | User, session, account, verification |
| Repository | 8 | Scorecards, diagrams, AI slop, cache |
| Arena | 5 | Rankings, battles, tournaments |
| Profile | 1 | Developer profile embeddings |
| Wiki | 2 | Pages, view tracking |
| Wrapped | 3 | Annual stats, invites, badges |
| DevOps | 6 | VMs, hosts, executions, images |
| Monetization | 3 | Subscriptions, API keys, featured repos |
| Analytics | 1 | Token usage tracking |

### Critical Issues

**1. Naming Inconsistency**
```
auth.ts:    userId (camelCase)
arena.ts:   userId (camelCase)
other files: user_id (snake_case) - mixed
```
**Fix:** Standardize on snake_case across all schemas.

**2. Missing Indexes**
- `session.token` - used for lookups, no index
- `(userId, createdAt)` on tokenUsage - time-series queries
- `(repoOwner, repoName)` composite - common filter

**3. Security Concerns**
- OAuth tokens stored in plaintext in `account` table
- `encryptedPassword` fields have no validation enforcement
- SSH private keys stored with only documented encryption

**4. Incomplete Relations**
`relations.ts` only covers ~30% of actual relationships. Missing:
- Arena relations (developerRankings, arenaBattles)
- Dev environment hierarchy
- GitHub analysis caches

**5. Duplication**
`repoOwner` + `repoName` repeated in 7+ tables. Should normalize to `repositories` table.

---

## API Routes

### Route Inventory

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/auth/[...better-auth]` | ALL | Auth handler | Better Auth |
| `/api/arena/battle` | GET | SSE battle execution | Session |
| `/api/profile/generate` | GET | SSE profile generation | Session |
| `/api/webhooks/github` | POST | GitHub webhook handler | Signature |
| `/api/webhooks/stripe` | POST | Stripe webhook handler | Signature |
| `/api/v1/scorecards/[owner]/[repo]` | GET | Public API | API Key |
| `/api/v1/arena/leaderboard` | GET | Public API | API Key |
| `/api/v1/profiles/search` | GET | Public API | API Key |
| `/api/wrapped/[year]/[username]/badge.svg` | GET | SVG badge | None |

### Issues & Improvements

**1. Critical Duplication: Profile Generation (~400 lines)**
Both `/api/arena/battle` and `/api/profile/generate` contain nearly identical logic for:
- Repository fetching and filtering
- Profile generation with streaming
- Database caching with versioning
- Locking mechanism for concurrent requests

**Fix:** Extract to shared `/lib/profile/generation-service.ts`

**2. Complexity**
- `/api/arena/battle/route.ts` - 530 lines
- `/api/profile/generate/route.ts` - 700 lines

Both should be broken into smaller modules.

**3. Missing Rate Limiting**
`/api/feature-request` is public with no rate limiting - spam vulnerable.

**4. Inconsistent Error Responses**
Some routes return JSON errors, others plain text.

---

## tRPC Routes

### Procedure Count by Router

| Router | Queries | Mutations | Subscriptions |
|--------|---------|-----------|---------------|
| profile | 8 | 2 | 1 |
| scorecard | 3 | 0 | 1 |
| arena | 5 | 2 | 0 |
| diagram | 4 | 1 | 1 |
| wrapped | 8 | 2 | 2 |
| wiki | 6 | 4 | 1 |
| admin | 8 | 2 | 1 |
| user | 8 | 2 | 0 |
| billing | 2 | 2 | 0 |
| api-keys | 2 | 2 | 0 |

### Critical Issues

**1. Stargazer Perk Check Duplication (3 places)**
```typescript
// Repeated in profile.ts, wrapped.ts, wiki.ts
const STARGAZER_REPO = 'lantos1618/github.gg';
let hasStarred = await getCachedStargazerStatus(ctx.user.id, STARGAZER_REPO);
if (hasStarred === null) {
  const githubService = await createGitHubServiceForUserOperations(ctx.session);
  hasStarred = await githubService.hasStarredRepo('lantos1618', 'github.gg');
  await setCachedStargazerStatus(ctx.user.id, STARGAZER_REPO, hasStarred);
}
```
**Fix:** Extract to `lib/utils/stargazer.ts`

**2. Large Files**
- `profile.ts` - 1,008 lines (should split into generation/search/email modules)
- `wrapped.ts` - 729 lines (should split into generation/sharing modules)

**3. SQL Injection Risk**
```typescript
// profile.ts line ~744
sql.raw(...)  // with user input
```
**Fix:** Use parameterized queries exclusively.

**4. Fire-and-Forget Pattern**
```typescript
// arena.ts executeBattle
fetch(`/api/arena/battle?battleId=${battle.id}`); // No error handling
```
**Fix:** Add error tracking or use job queue.

---

## AI Modules

### Model Usage Distribution

| Model | Files | Purpose |
|-------|-------|---------|
| gemini-3-pro-preview | 8 | Quality analysis |
| gemini-2.5-flash | 4 | Fast chunking |
| gemini-2.0-flash | 2 | Lightweight tasks |
| text-embedding-004 | 1 | Vector embeddings |

### File Summary

| File | Lines | Purpose |
|------|-------|---------|
| developer-profile.ts | 750 | Profile generation (largest) |
| wiki-generator.ts | 600 | Wiki with context caching |
| wrapped-insights.ts | 450 | Annual insights |
| documentation.ts | 510 | Auto-documentation |
| ai-slop.ts | 280 | AI code detection |
| scorecard.ts | 170 | Repo scoring |
| Others | ~800 | Battle, PR, issue, commit analysis |

### Critical Duplication

**1. Retry Logic (2 implementations)**
```typescript
// ai-slop.ts lines 58-88
async function retryWithBackoff<T>(...) { ... }

// wiki-generator.ts lines 8-47
async function retryWithBackoff<T>(...) { ... }
```
**Fix:** Extract to `/lib/ai/retry-utils.ts`

**2. Chunking Logic (2 implementations)**
Token-based chunking duplicated in:
- `ai-slop.ts` lines 204-231
- `documentation.ts` lines 283-306

**Fix:** Extract to `/lib/ai/chunking-utils.ts`

**3. Markdown Formatters (3 similar)**
- `commit-analysis.ts`: `formatCommitAnalysisAsMarkdown()`
- `issue-analysis.ts`: `formatIssueAnalysisAsMarkdown()`
- `pr-analysis.ts`: `formatPRAnalysisAsMarkdown()`

**Fix:** Create shared markdown builder utility.

---

## GitHub Integration

### File Summary

| File | Lines | Purpose |
|------|-------|---------|
| wrapped-service.ts | 1,122 | Annual stats (largest) |
| repository-service.ts | 337 | Repo operations |
| commit-issue-comment-service.ts | 332 | Comment automation |
| pr-comment-service.ts | 288 | PR reviews |
| app.ts | 241 | GitHub App auth |
| user-service.ts | 126 | User operations |

### Critical Issues

**1. Text Sanitization Duplication**
```typescript
// Identical in commit-issue-comment-service.ts and pr-comment-service.ts
function sanitizeText(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // ... 5 more patterns
}
```
**Fix:** Move to `/lib/utils/sanitize.ts` (already exists but not used here).

**2. Subscription Check Duplication**
Same 18-line subscription verification block appears in 3 services.

**3. Wrapped Service Issues**
- Line 754: Duplicate slice `slice(0, 5).slice(0, 3)` (likely bug)
- Line 978-984: `detectEnvLeaks()` regex has high false-positive rate
- No cancellation/timeout for long operations

**4. Cache Limitations**
`cache.ts` has no memory limit, no eviction policy, 5-min TTL hardcoded.

---

## Utilities & Configuration

### Utils Summary

| File | Lines | Purpose | Issues |
|------|-------|---------|--------|
| cost-calculator.ts | 192 | Token cost tracking | Hardcoded pricing |
| encryption.ts | 41 | AES-256-CBC encryption | Sync scrypt, no auth tag |
| errorHandling.ts | 150 | Error classification | Brittle pattern matching |
| sanitize.ts | 25 | XSS prevention | Regex-based, not DOMPurify |
| seo.ts | 103 | SEO utilities | Good |
| url.ts | 57 | URL normalization | Duplicates seo.ts logic |

### Auth Module Issues

**Duplicate Files:**
- `client.ts` (62 lines) - OLD implementation
- `prod-adapter.ts` (66 lines) - DUPLICATE of client.ts

**Fix:** Remove `client.ts`, keep `prod-adapter.ts` only.

### Hooks Summary

| Hook | Lines | Purpose | Status |
|------|-------|---------|--------|
| useDiagramGeneration | 198 | SSE diagram gen | Too complex, needs refactor |
| useRepoData | 164 | Data fetching | Good but 6 exports |
| useInstallationStatus | 87 | Install check | Has unused admin query |
| useDebouncedValue | 12 | Debounce | Excellent |
| useIntersectionObserver | 51 | Scroll observer | Excellent |

### Config Organization (Good)
Central config in `/lib/config/index.ts` with 48 values across 11 sections:
- PAGINATION_CONFIG, RETRY_CONFIG, CACHE_CONFIG
- ANALYSIS_CONFIG, RATE_LIMIT_CONFIG, TIMEOUT_CONFIG
- ARENA_CONFIG, REPO_CONFIG, UI_CONFIG, EMAIL_CONFIG, GITHUB_CONFIG

---

## React Components

### Summary by Directory

| Directory | Files | Lines | Key Pattern |
|-----------|-------|-------|-------------|
| ui/ | 40 | 2,732 | shadcn/ui wrappers |
| wrapped/ | 16 | 1,031 | Animation-heavy slides |
| profile/ | 12 | 1,584 | Heavy state management |
| analysis/ | 8 | ~600 | Generic config-driven |
| wiki/ | 8 | ~500 | CRUD with lazy editor |
| diagram/ | 7 | ~350 | Mermaid rendering |

### Critical Issues

**1. DeveloperProfile.tsx - 800 lines (largest component)**
Contains:
- Profile generation logic
- Error handling
- UI rendering
- Version management
- 20+ useState/useRef hooks
- 200 lines of duplicate code between two generation functions

**Fix:** Extract to:
- `useProfileGeneration()` hook
- `ProfileLoadingState`, `ProfileErrorState`, `ProfileContent` components

**2. Duplicate SSE Event Parsing**
EventSource handling duplicated in:
- `DeveloperProfile.tsx`
- `GenericAnalysisView.tsx`

**Fix:** Create `useSSESubscription()` hook.

**3. Animation Constants Scattered**
20 components use framer-motion with hardcoded timing (1200ms, 2000ms, etc.)

**Fix:** Create `/lib/animation-timing.ts` with centralized constants.

**4. Color Duplication**
Score colors defined separately in:
- ProfileHeader
- BattleCard
- QualityMetrics
- stat-card.tsx
- badge.tsx

**Fix:** Create `/lib/colors/semantic-colors.ts`

---

## Pages & Layouts

### Layout Issues

**Single Root Layout Problem:**
Only one layout (`/app/layout.tsx`) handles ALL concerns:
- Providers (TRPC, PostHog, Analytics)
- Navbar/Footer positioning
- Toast notifications
- Schema markup

**Fix:** Add segment-specific layouts:
- `/wiki/layout.tsx` for wiki section
- `/admin/layout.tsx` for admin section

### Page Issues

**1. Settings Page Complexity**
`/settings/page.tsx` - 679 lines with 11+ tRPC queries/mutations

**Fix:** Split into:
- `<ProfileCustomizationCard />`
- `<APIKeyManagement />`
- `<WebhookSettings />`
- `<UsageStatistics />`

**2. Duplicate Bash Script**
Identical 52-line bash script in both:
- `/cli/page.tsx`
- `/developers/page.tsx`

**Fix:** Extract to `/lib/content/cli-scripts.ts`

**3. Loading Skeleton Duplication**
Similar skeleton patterns in 5+ loading.tsx files.

**Fix:** Create reusable skeleton components.

**4. Missing Error Boundaries**
Only one global `/error.tsx` at root. Complex routes like `/[user]` need segment-level error handling.

**5. Inconsistent Auth Checks**
- `/admin` - Checks session, redirects
- `/settings` - No explicit check (fails on query)

**Fix:** Standardize with middleware.

---

## Priority Recommendations

### High Priority (Do First)

1. **Extract Duplicate Code**
   - [ ] `lib/utils/stargazer.ts` - Stargazer perk check
   - [ ] `lib/ai/retry-utils.ts` - Retry with backoff
   - [ ] `lib/ai/chunking-utils.ts` - Token chunking
   - [ ] `lib/content/cli-scripts.ts` - Bash script

2. **Refactor Large Files**
   - [ ] Split `profile.ts` (1000+ lines) into modules
   - [ ] Split `DeveloperProfile.tsx` (800 lines) into components
   - [ ] Split `/settings/page.tsx` (679 lines) into components

3. **Security Fixes**
   - [ ] Use async `crypto.scrypt()` instead of sync version
   - [ ] Add HMAC authentication to encrypted data (switch to GCM)
   - [ ] Add rate limiting to `/api/feature-request`

4. **Remove Dead Code**
   - [ ] Delete `lib/auth/client.ts` (duplicate of prod-adapter.ts)
   - [ ] Remove unused admin query in `useInstallationStatus`

### Medium Priority

5. **Database Improvements**
   - [ ] Standardize naming convention (snake_case)
   - [ ] Add missing indexes on frequently queried columns
   - [ ] Complete `relations.ts` with all relationships
   - [ ] Create normalized `repositories` table

6. **Add Segment Layouts**
   - [ ] `/wiki/layout.tsx`
   - [ ] `/admin/layout.tsx`

7. **Add Error Boundaries**
   - [ ] `/[user]/error.tsx`
   - [ ] `/admin/error.tsx`
   - [ ] `/wiki/error.tsx`

8. **Create Shared Utilities**
   - [ ] `useSSESubscription()` hook
   - [ ] Animation timing constants
   - [ ] Semantic color constants
   - [ ] Reusable loading skeletons

### Low Priority

9. **Documentation**
   - [ ] Add JSDoc to all exported functions
   - [ ] Document SSE event formats
   - [ ] Document tRPC procedure purposes

10. **Testing**
    - [ ] Add integration tests for subscription flows
    - [ ] Test versioning conflict handling
    - [ ] Test access control (private repos, admin checks)

---

## Appendix: File Metrics

### Largest Files (by lines)
1. `wrapped-service.ts` - 1,122 lines
2. `profile.ts` (tRPC) - 1,008 lines
3. `DeveloperProfile.tsx` - 800 lines
4. `wrapped.ts` (tRPC) - 729 lines
5. `settings/page.tsx` - 679 lines

### Most Complex Components (by hook count)
1. `DeveloperProfile.tsx` - 20+ hooks
2. `useDiagramGeneration` - 10+ useState
3. `GenericAnalysisView` - 8 hooks
4. `WrappedStory` - 6 hooks

### Duplication Summary
| Pattern | Occurrences | Lines Duplicated |
|---------|-------------|------------------|
| Stargazer check | 3 | ~45 lines each |
| Retry with backoff | 2 | ~40 lines each |
| Text sanitization | 2 | ~15 lines each |
| Subscription check | 3 | ~18 lines each |
| Bash script | 2 | ~52 lines each |

---

*Review generated by Claude Code (Opus 4.5) on January 26, 2026*
