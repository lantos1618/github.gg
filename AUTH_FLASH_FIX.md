# Fix: Auth/Plan Flash Problem

## The Problem

Authenticated users see wrong UI on every page load:
- Navbar: Sign In button → User Menu (flash)
- Pricing: loading pulse → "Current Plan" (flash)
- Settings: "Upgrade" → customization form (flash)
- Profile: wrong buttons while `usePlan()` resolves

Root cause: `useAuth()` and `usePlan()` are async client hooks. Server renders default (anonymous) HTML → client hydrates → hooks fire network requests → UI jumps 300-500ms later.

## How Big Sites Fix This

**Server-provided session context.** The root layout reads the session cookie server-side and passes it down as a React context. Client components read the context synchronously — no async hop, no flash.

GitHub, Vercel, Linear all do this. The session is already in the cookie. The server just needs to read it and embed it in the component tree.

## The Fix

### What changes

```
src/app/layout.tsx            — read session, wrap children in provider
src/lib/session-context.tsx   — new: server session context (8 lines)
src/components/NavbarServer.tsx — pass session to NavbarClient
src/components/NavbarClient.tsx — use initial session, no flash
src/components/PricingCardActions.tsx — use initial session for plan
src/app/automations/page.tsx  — convert to server component with auth check
```

### How it works

**Step 1: Root layout reads session and provides it**

```tsx
// app/layout.tsx (server component)
const session = await auth.api.getSession({ headers: await headers() });

return (
  <SessionProvider initialSession={session}>
    <NavbarServer session={session} />
    {children}
  </SessionProvider>
);
```

**Step 2: Client components read session synchronously**

```tsx
// Any client component
const initialSession = useInitialSession(); // synchronous, from server
const { user } = useAuth(); // async, updates later

// Use server data immediately, client data when available
const currentUser = user ?? initialSession?.user;
```

**Step 3: Plan data via server too**

For pages that need plan (settings, pricing), the server page.tsx fetches it:
```tsx
// Already done for settings/admin. Need to do for pricing.
const plan = await caller.user.getCurrentPlan();
return <PricingClient initialPlan={plan} />;
```

### Flash risk matrix — before vs after

| Component | Before | After |
|-----------|--------|-------|
| Navbar (every page) | Sign In → User Menu flash | Correct from first paint |
| PricingCardActions | pulse → button text change | Correct from first paint |
| Settings | "Upgrade" → customization | Already fixed (initialData) |
| Admin | loading → stats | Already fixed (initialData) |
| DeveloperProfile | wrong buttons briefly | Correct (session context) |
| Automations | marketing → auth UI | Correct (server auth check) |

### Files to create/modify

| File | Change | Why |
|------|--------|-----|
| `src/lib/session-context.tsx` | **NEW** | Context provider + hook (~15 lines) |
| `src/app/layout.tsx` | Add session fetch + provider | Root of the fix |
| `src/components/NavbarServer.tsx` | Pass session prop | Server knows auth state |
| `src/components/NavbarClient.tsx` | Use `useInitialSession()` | No flash on nav |
| `src/components/PricingCardActions.tsx` | Accept optional `initialPlan` prop | No flash on pricing |
| `src/app/pricing/page.tsx` | Fetch plan server-side if session exists | Seed plan data |
| `src/app/automations/page.tsx` | Convert to server component + client split | No flash |

### What NOT to change

- **Settings, Admin** — already fixed with server-side initialData
- **Discover** — already server-redirects if no auth
- **Better-auth config** — no changes needed
- **tRPC setup** — no changes needed
- **Middleware** — not needed (layout.tsx is sufficient)

### Execution order

```
1. Create session-context.tsx
2. Update layout.tsx (read session, wrap in provider)
3. Fix NavbarServer → NavbarClient (pass session, use context)
4. Fix PricingCardActions (accept initialPlan)
5. Fix pricing/page.tsx (server-fetch plan)
6. Fix automations/page.tsx (server component split)
7. Verify build
8. Push
```

### Performance impact

- Layout already calls `headers()` for other reasons — adding `getSession()` is ~1ms (cookie parse, no DB hit on cache)
- No additional network requests
- No middleware overhead
- Bundle size: +15 lines of context code
