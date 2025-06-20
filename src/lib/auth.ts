import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';
import { env } from './env';

export const auth = betterAuth({
    adapter: drizzleAdapter(db, {
        schema,
        provider: 'pg',
        usePlural: true,
    }),
    socialProviders: {
        github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            scope: ['repo', 'read:user', 'user:email'],
        }
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
    },
    secret: env.BETTER_AUTH_SECRET,
});