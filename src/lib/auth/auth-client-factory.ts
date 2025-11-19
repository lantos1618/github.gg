/**
 * Shared auth client initialization
 * Single source of truth for better-auth client configuration
 */
import { createAuthClient } from "better-auth/react";

const getAuthBaseURL = (): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/auth`;
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth`;
  }
  
  return "http://localhost:3000/api/auth";
};

// Initialize once and export the hooks
const authClient = createAuthClient({
  baseURL: getAuthBaseURL()
});

export const { useSession, signIn, signOut: betterAuthSignOut } = authClient;
