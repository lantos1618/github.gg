import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

/**
 * This is the single source of truth for authentication.
 * It uses `better-auth` to handle the OAuth flow with GitHub.
 * The user's installation status is stored in our database, linked to their account.
 */
export const auth = betterAuth({
  trustedOrigins: ["https://github.gg", "https://dev.github.gg"],
  database: drizzleAdapter(db, {
    schema,
    provider: 'pg',
    usePlural: false,
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ['repo', 'read:user', 'user:email', 'read:org'],
      authorization: {
        // This is key for allowing users to switch GitHub accounts on sign-in.
        params: {
          prompt: 'select_account',
        },
      },
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  secret: process.env.BETTER_AUTH_SECRET!,
}); 