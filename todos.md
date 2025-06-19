# TODOs

## Completed ✅
- [x] Set up tRPC context with Better Auth instead of NextAuth
- [x] Implement inner/outer context pattern for better type safety
- [x] Create proper session typing with Better Auth
- [x] Update protected procedures to use Better Auth session
- [x] Ensure compatibility with existing routes
- [x] Update database schema to match Better Auth requirements
- [x] Configure Better Auth with Drizzle adapter
- [x] Add GitHub scope permissions for repo access
- [x] Create githubProcedure for GitHub-specific routes
- [x] Use Better Auth's getAccessToken method for fresh tokens
- [x] Add GitHub account linking with additional scopes
- [x] Add token debugging/testing endpoint
- [x] Handle token refresh automatically via Better Auth
- [x] Create dead simple landing page with Swiss design principles
- [x] Improve GitHub service error handling with specific error messages
- [x] Add GitHub API connection test endpoint for debugging
- [x] Add token validation and format checking

## Next Steps
- [ ] Test GitHub authentication flow
- [ ] Add error handling for missing GitHub tokens
- [ ] Create more GitHub API endpoints (issues, PRs, etc.)
- [ ] Add rate limiting to context
- [ ] Set up server-side helpers for SSR
- [ ] Add user profile management routes
- [ ] Test account linking flow for additional scopes
- [ ] **URGENT: Fix GitHub token issue - current token appears invalid/expired** 