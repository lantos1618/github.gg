# Authentication Migration Guide

## 🧹 **What We Fixed**

We had **6 scattered auth files** doing similar things:
- `src/lib/auth.ts` - Better Auth setup
- `src/lib/auth-server.ts` - Server-side auth helpers  
- `src/lib/auth-client.ts` - Client-side auth setup
- `src/lib/github-app-auth.ts` - GitHub App session management
- `src/lib/hooks/useAuth.ts` - OAuth hook
- `src/lib/hooks/useGitHubAppAuth.ts` - GitHub App hook

## 🎯 **New Unified Structure**

### **Server-Side** (`src/lib/auth/index.ts`)
```typescript
import { AuthService, getUnifiedSession, requireAuth } from '@/lib/auth';

// Get unified session (tries OAuth first, then GitHub App)
const session = await getUnifiedSession();

// Require authentication (redirects to /install if not signed in)
const session = await requireAuth();

// GitHub App specific operations
import { GitHubAppSessionManager } from '@/lib/auth';
const session = await GitHubAppSessionManager.getSession();
```

### **Client-Side** (`src/lib/auth/client.ts`)
```typescript
import { useAuth } from '@/lib/auth/client';

function MyComponent() {
  const { 
    session, 
    user, 
    isSignedIn, 
    authType, 
    signIn, 
    signOut, 
    installGitHubApp 
  } = useAuth();
  
  // Unified session works for both OAuth and GitHub App
  if (isSignedIn) {
    return <div>Welcome, {user?.name}!</div>;
  }
}
```

## 🔄 **Migration Steps**

### **1. Update Imports**
```typescript
// OLD
import { auth } from '@/lib/auth';
import { getUnifiedSession } from '@/lib/auth-server';
import { useAuth } from '@/lib/hooks/useAuth';

// NEW
import { auth, getUnifiedSession } from '@/lib/auth';
import { useAuth } from '@/lib/auth/client';
```

### **2. Update API Routes**
```typescript
// OLD
import { auth } from '@/lib/auth';
import { getGitHubAppSession } from '@/lib/github-app-auth';

// NEW
import { auth, GitHubAppSessionManager } from '@/lib/auth';
const session = await GitHubAppSessionManager.getSession();
```

### **3. Update Components**
```typescript
// OLD
import { useAuth } from '@/lib/hooks/useAuth';
import { useGitHubAppAuth } from '@/lib/hooks/useGitHubAppAuth';

// NEW
import { useAuth } from '@/lib/auth/client';
// Single hook handles both auth types!
```

## 🎯 **Benefits**

1. **DRY**: No more duplicated auth logic
2. **KISS**: Single import for all auth needs
3. **Unified**: One session interface for both auth types
4. **Maintainable**: All auth logic in one place
5. **Type Safe**: Proper TypeScript interfaces

## 📁 **New File Structure**

```
src/lib/auth/
├── index.ts          # Server-side auth (Better Auth + GitHub App)
├── client.ts         # Client-side unified hook
└── types.ts          # Shared types (if needed)
```

## 🚀 **Backward Compatibility**

The new structure maintains **100% backward compatibility**:
- All existing imports still work
- Same API surface
- Same functionality
- Just cleaner organization

This consolidation eliminates the auth mess and gives us a single, clean authentication system! 🎉 