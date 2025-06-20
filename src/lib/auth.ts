import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
    adapter: drizzleAdapter(db, {
        schema,
        provider: 'pg',
        usePlural: true,
    }),
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            scope: ['repo', 'read:user', 'user:email'],
        }
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
    },
});