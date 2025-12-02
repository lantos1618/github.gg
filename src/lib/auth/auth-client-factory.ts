/**
 * Shared auth client initialization
 * Single source of truth for better-auth client configuration
 */
import { createAuthClient } from "better-auth/react";
import { getAuthBaseUrl } from "@/lib/utils/url";

// Initialize once and export the hooks
const authClient = createAuthClient({
  baseURL: getAuthBaseUrl()
});

export const { useSession, signIn, signOut: betterAuthSignOut } = authClient;
