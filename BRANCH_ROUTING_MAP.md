# Branch Routing and Selection Logic Map

## Route Structure Analysis

### 1. Regular Repository Routes (handled by `/[user]/[[...params]]/page.tsx`)

#### Pattern: `/owner/repo`
- **Branch**: Default branch (not in URL)
- **Branch Selector**: Shows default branch
- **On Change**: Navigate to `/owner/repo/tree/{newBranch}`
- **parseRepoPath input**: `{ user: 'owner', params: ['repo'] }`
- **parseRepoPath output**: `{ repo: 'repo', ref: undefined }`

#### Pattern: `/owner/repo/tree/branch`
- **Branch**: Explicitly specified via `/tree/` prefix
- **Branch Selector**: Shows the specified branch
- **On Change**: Navigate to `/owner/repo/tree/{newBranch}`
- **parseRepoPath input**: `{ user: 'owner', params: ['repo', 'tree', 'branch'] }`
- **parseRepoPath output**: `{ repo: 'repo', ref: 'branch' }`

#### Pattern: `/owner/repo/branch` (ambiguous)
- **Branch**: Parsed as branch if not a tab keyword
- **Branch Selector**: Shows parsed branch
- **On Change**: Navigate to `/owner/repo/tree/{newBranch}`
- **parseRepoPath input**: `{ user: 'owner', params: ['repo', 'branch'] }`
- **parseRepoPath output**: `{ repo: 'repo', ref: 'branch' }` (if branch is in branchNames)

#### Pattern: `/owner/repo/scorecard` (tab, no branch)
- **Branch**: Default branch (tab keyword in URL)
- **Branch Selector**: Shows default branch
- **On Change**: Navigate to `/owner/repo/tree/{newBranch}/scorecard`
- **parseRepoPath input**: `{ user: 'owner', params: ['repo', 'scorecard'] }`
- **parseRepoPath output**: `{ repo: 'repo', ref: undefined, tab: 'scorecard' }`

#### Pattern: `/owner/repo/tree/branch/scorecard`
- **Branch**: Explicitly specified branch with tab
- **Branch Selector**: Shows specified branch
- **On Change**: Navigate to `/owner/repo/tree/{newBranch}/scorecard`
- **parseRepoPath input**: `{ user: 'owner', params: ['repo', 'tree', 'branch', 'scorecard'] }`
- **parseRepoPath output**: `{ repo: 'repo', ref: 'branch', tab: 'scorecard' }`

### 2. Wiki Routes (separate route handler)

#### Pattern: `/wiki/owner/repo`
- **Branch**: N/A - wikis are repository-level, not branch-specific
- **Branch Selector**: Should show default branch (for UI consistency)
- **On Change**: Navigate to `/owner/repo/tree/{newBranch}` (switch to file browser)
- **Current parseRepoPath input**: `{ user: 'owner', params: ['owner', 'repo'] }` ❌ WRONG!
- **Current parseRepoPath output**: `{ repo: 'owner', ref: 'repo' }` ❌ WRONG!

#### Pattern: `/wiki/owner/repo/slug`
- **Branch**: N/A - wiki pages are not branch-specific
- **Branch Selector**: Should show default branch
- **On Change**: Navigate to `/owner/repo/tree/{newBranch}`
- **Current parseRepoPath input**: `{ user: 'owner', params: ['owner', 'repo', 'slug'] }` ❌ WRONG!
- **Current parseRepoPath output**: `{ repo: 'owner', ref: 'repo' }` ❌ WRONG!

## Current Problems Identified

### Problem 1: Incorrect parseRepoPath Usage for Wiki Routes
RepoSidebar.tsx (lines 68-71):
```javascript
const pathParts = pathname.split('/').filter(Boolean);
const params = { user: owner, params: pathParts.slice(1) };
const parsed = parseRepoPath(params, branches || []);
```

When pathname = `/wiki/lantos1618/ewor_brainfuck`:
- pathParts = `['wiki', 'lantos1618', 'ewor_brainfuck']`
- params = `{ user: 'lantos1618', params: ['lantos1618', 'ewor_brainfuck'] }`
- parseRepoPath interprets this as: repo='lantos1618', ref='ewor_brainfuck'
- This causes "ewor_brainfuck" (the repo name) to be detected as the branch!

### Problem 2: Branch Selector Behavior on Wiki
Current code (lines 77 and 83-88):
```javascript
const currentBranch = isOnWikiPage ? defaultBranch : (parsed.ref || defaultBranch);

const handleBranchChange = (newBranch: string) => {
  if (isOnWikiPage) {
    router.push(`/wiki/${owner}/${repo}`); // Just redirects to wiki index
    return;
  }
  // ...
}
```

Issues:
1. `currentBranch` is forced to `defaultBranch`, but the select dropdown value is controlled by this
2. Changing the dropdown triggers `handleBranchChange` which just redirects to wiki index
3. This means the dropdown value never actually changes when you select a different option

### Problem 3: Base URL Construction
Line 81:
```javascript
const baseUrl = currentBranch === defaultBranch ? `/${owner}/${repo}` : `/${owner}/${repo}/${currentBranch}`;
```

This doesn't use `/tree/` prefix when branch is not default, which creates ambiguous URLs.

## Correct Implementation Plan

### Fix 1: Don't Use parseRepoPath for Wiki Routes
When on wiki, we already know the owner and repo from props. Don't parse the pathname.

### Fix 2: Proper Branch Change Handling
When on wiki and branch is changed:
1. If new branch === default branch: navigate to `/owner/repo`
2. If new branch !== default branch: navigate to `/owner/repo/tree/{newBranch}`

When on regular route and branch is changed:
1. Preserve the current tab (if any)
2. If new branch === default branch: navigate to `/owner/repo/{tab}`
3. If new branch !== default branch: navigate to `/owner/repo/tree/{newBranch}/{tab}`

### Fix 3: Always Use /tree/ Prefix for Non-Default Branches
For clarity and to avoid ambiguity, always use the `/tree/` prefix when specifying a non-default branch.

## Tab Keywords (Reserved Paths)
From parseRepoPath: `["scorecard", "diagram", "ai-slop", "automations", "issues", "pulls", "dependencies", "architecture", "components", "data-flow"]`

These are NOT branch names, they are special tab paths.
