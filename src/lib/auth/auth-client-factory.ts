"use client";

/**
 * Shared auth client initialization
 * Single source of truth for better-auth client configuration
 *
 * This module is client-only. The baseURL uses window.location.origin
 * to ensure requests go to the same origin the user is on, avoiding
 * CORS issues when accessing via www vs non-www subdomain.
 */
import { createAuthClient } from "better-auth/react";

// Client-side only: use current origin to avoid CORS issues with www vs non-www
const authClient = createAuthClient({
  baseURL: typeof window !== "undefined"
    ? `${window.location.origin}/api/auth`
    : "https://github.gg/api/auth" // Fallback for SSR hydration, overwritten on client
});

export const { useSession, signIn, signOut: betterAuthSignOut } = authClient;
