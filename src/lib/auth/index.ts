import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * This is the single source of truth for authentication.
 * It uses `better-auth` to handle the OAuth flow with GitHub.
 * The user's installation status is stored in our database, linked to their account.
 */
export const auth = betterAuth({
  trustedOrigins: [
    "https://github.gg",
    "https://dev.github.gg",
    "http://dev.github.gg",
    "http://localhost:3000",
    "https://www.github.gg"
  ],
  database: drizzleAdapter(db, {
    schema,
    provider: 'pg',
    usePlural: false,
  }),
  user: {
    additionalFields: {
      githubUsername: {
        type: 'string',
        required: false,
        input: false, // Don't allow direct input
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        async after(session) {
          // Update githubUsername every time a user logs in
          try {
            // Find the GitHub account for this user
            const githubAccount = await db.query.account.findFirst({
              where: (account, { and, eq }) =>
                and(
                  eq(account.userId, session.userId),
                  eq(account.providerId, 'github')
                ),
            });

            if (githubAccount && githubAccount.accountId) {
              // Fetch GitHub username from API
              const response = await fetch(
                `https://api.github.com/user/${githubAccount.accountId}`,
                {
                  headers: {
                    Accept: 'application/vnd.github.v3+json',
                    'User-Agent': 'github.gg',
                    ...(githubAccount.accessToken && {
                      Authorization: `token ${githubAccount.accessToken}`,
                    }),
                  },
                }
              );

              if (response.ok) {
                const githubProfile = await response.json();
                const githubUsername = githubProfile.login?.toLowerCase();

                if (githubUsername) {
                  // Update user with GitHub username
                  await db
                    .update(schema.user)
                    .set({ githubUsername })
                    .where(eq(schema.user.id, session.userId));

                  console.log(
                    `[Auth] Updated githubUsername for user ${session.userId}: ${githubUsername}`
                  );
                }
              }
            }
          } catch (error) {
            console.error('[Auth] Failed to update githubUsername:', error);
            // Don't throw - auth should succeed even if username update fails
          }
        },
      },
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ['repo', 'read:user', 'user:email', 'read:org', 'notifications'],
      prompt: 'select_account',
      authorization: {
        // This is key for allowing users to switch GitHub accounts on sign-in.
        params: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  secret: process.env.BETTER_AUTH_SECRET!,
}); 