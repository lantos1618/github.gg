/**
 * Shared auth client initialization
 * Single source of truth for better-auth client configuration
 */
import { createAuthClient } from "better-auth/react";

// Use a relative path for baseURL - this ensures requests go to the same origin
// the user is on, avoiding CORS issues when accessing via www vs non-www
const authClient = createAuthClient({
  baseURL: "/api/auth"
});

export const { useSession, signIn, signOut: betterAuthSignOut } = authClient;
