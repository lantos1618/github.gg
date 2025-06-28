# Unified Hybrid Authentication System

## 🎯 **Objective**
Resolve the conflict between OAuth (`better-auth`) and GitHub App authentication by creating a unified system where:
- **OAuth remains the primary authentication** (supports multiple providers)
- **GitHub App installation enhances the user's capabilities** (private repo access, webhooks)
- **One user session that can be enhanced** with GitHub App permissions
- **Flexible authentication** that can add Google, GitLab, etc. later

## 🚨 **Current Problem**
- Two parallel authentication systems that don't communicate
- OAuth users can't access private repos via GitHub App
- GitHub App users don't have formal `better-auth` sessions
- Architectural friction blocking advanced features

## ✅ **COMPLETED - Foundation**

### ✅ Existing Infrastructure
- [x] `better-auth` OAuth system with GitHub provider
- [x] GitHub App installation flow (`/install/callback`)
- [x] Database schema with `user` and `account` tables
- [x] GitHub App webhook infrastructure
- [x] Basic GitHub service with installation token support

## 🚧 **IN PROGRESS - Database Schema Updates**

### 🔄 Step 1: Update Database Schema
- [x] **Add `installationId` to `account` table** in `src/db/schema.ts`
  ```typescript
  installationId: integer('installation_id')
  ```
- [x] **Run database migration**
  - [x] `bun run db:generate`
  - [x] `bun run db:push`
- [x] **Update TypeScript types** for the new field
- [x] **Test schema changes** with existing data

## 📋 **TODO - Core Implementation**

### 🔄 Step 2: Create Installation Linking API
- [x] **Create `/api/auth/link-installation` endpoint**
  - [x] Protected route requiring `better-auth` session
  - [x] Accept `installationId` in request body
  - [x] Update user's account record with installation ID
  - [x] Handle errors (invalid installation, already linked, etc.)
  - [x] Return success/error response
  - [x] Add GET endpoint to check installation link status

### 🔄 Step 3: Modify Installation Callback Logic
- [x] **Update `/install/callback/page.tsx`**
  - [x] Check if user has existing `better-auth` session
  - [x] If logged in: call linking API to associate installation
  - [x] If not logged in: redirect to OAuth login first
  - [x] Handle edge cases (installation already linked to another user)
  - [x] Show success/error messages to user

### 🔄 Step 4: Enhance GitHub Service Logic
- [x] **Update `getBestOctokitForRepo` function**
  - [x] Check if logged-in user has linked installation
  - [x] Use installation token for private repos
  - [x] Fallback to OAuth token for public repos
  - [x] Fallback to public API key for anonymous users
- [x] **Update `GitHubService.createForRepo`**
  - [x] Integrate with new unified token logic
  - [x] Handle permission errors gracefully
  - [x] Log which token type is being used

### 🔄 Step 5: Update UI Components
- [x] **Update `Navbar.tsx`**
  - [x] Always use `useAuth()` from `better-auth`
  - [x] Show "Install GitHub App" button if user logged in but no installation
  - [x] Show installation status (linked/unlinked)
  - [x] Handle installation linking flow
- [x] **Create installation status component**
  - [x] Display current GitHub App installation status
  - [x] Show linked repositories
  - [x] Provide re-installation option

## 🔧 **Technical Implementation Details**

### Database Schema Changes
```typescript
// src/db/schema.ts
export const account = pgTable('account', {
  // ... existing fields
  installationId: integer('installation_id'), // NEW FIELD
}, (table) => ({
  providerUserIdx: uniqueIndex('provider_user_idx').on(table.providerId, table.userId),
}));
```

### API Endpoint Structure
```typescript
// /api/auth/link-installation
export default async function handler(req, res) {
  const session = await auth.api.getSession(req);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  const { installationId } = req.body;
  // Update user's account record
  // Return success/error
}
```

### Token Selection Logic
```typescript
// Priority order for GitHub API tokens:
// 1. Installation token (if user has linked installation)
// 2. OAuth token (if user logged in via OAuth)
// 3. Public API key (fallback for anonymous users)
```

## 🧪 **Testing Checklist**

### Authentication Flow Tests
- [ ] **OAuth Login**: User can sign in with GitHub OAuth
- [ ] **Installation Linking**: Logged-in user can link GitHub App installation
- [ ] **Installation First**: User installing app without OAuth gets redirected to login
- [ ] **Session Persistence**: Installation link persists across sessions
- [ ] **Multiple Installations**: Handle user with multiple GitHub accounts

### API Access Tests
- [ ] **Public Repos**: Anonymous users can access public repos
- [ ] **Private Repos**: Linked users can access private repos
- [ ] **OAuth Fallback**: Users without installation can use OAuth token
- [ ] **Permission Errors**: Graceful handling of insufficient permissions
- [ ] **Rate Limiting**: Proper token usage to avoid rate limits

### UI/UX Tests
- [ ] **Navbar States**: All authentication states display correctly
- [ ] **Installation Prompt**: Users see appropriate installation prompts
- [ ] **Error Handling**: Clear error messages for failed operations
- [ ] **Loading States**: Proper loading indicators during operations

## 🗑️ **Cleanup Tasks**

### Remove Redundant Code
- [ ] **Delete `src/lib/github-app-auth.ts`** (replaced by unified system)
- [ ] **Delete `src/lib/hooks/useGitHubAppAuth.ts`** (use `better-auth` instead)
- [ ] **Remove standalone session handlers** in `/api/auth/github-app/route.ts`
- [ ] **Update imports** throughout codebase
- [ ] **Remove unused environment variables** (if any)

### Documentation Updates
- [ ] **Update authentication documentation**
- [ ] **Update API documentation** for new endpoints
- [ ] **Update deployment guide** with new requirements
- [ ] **Update README** with new authentication flow

## 🚀 **What This Unlocks**

### Immediate Benefits
- ✅ **Unified User Experience**: One login system with enhanced capabilities
- ✅ **Private Repo Access**: Users can analyze their private repositories
- ✅ **Webhook Support**: Real-time events for automated analysis
- ✅ **Future-Proof**: Easy to add Google, GitLab, etc. authentication

### Next High-Impact Features
- 🎯 **Automated PR Comments**: Use webhooks to comment on pull requests
- 🎯 **Status Checks**: Add automated checks to PR status
- 🎯 **Organization Support**: Handle org-wide installations
- 🎯 **Multi-Provider Auth**: Add Google, GitLab, etc.

## 📊 **Progress Tracking**

- [x] **Step 1**: Database Schema Updates (4/4 tasks)
- [x] **Step 2**: Installation Linking API (6/6 tasks)
- [x] **Step 3**: Callback Logic Updates (5/5 tasks)
- [x] **Step 4**: GitHub Service Enhancement (4/4 tasks)
- [x] **Step 5**: UI Component Updates (4/4 tasks)
- [ ] **Testing**: Complete Test Suite (0/15 tasks)
- [ ] **Cleanup**: Code Removal & Documentation (0/8 tasks)

**Overall Progress: 23/46 tasks completed (50%)**

## 🎯 **Success Criteria**

- [x] Users can sign in with OAuth and link GitHub App installation
- [x] Linked users can access private repositories
- [x] Unlinked users can still use public features
- [x] Installation linking persists across sessions
- [x] No breaking changes to existing functionality
- [x] Clean, maintainable codebase with unified auth logic

---

**Priority: HIGH** - This is the foundational work needed to unlock advanced features like automated PR comments and private repo analysis. 