import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';
import { env } from './env';
import { sql } from 'drizzle-orm';

// Ensure database connection is established before initializing auth
const ensureDbConnection = async () => {
  try {
    // Test the connection
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection verified for Better Auth');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed for Better Auth:', error);
    return false;
  }
};

// Create auth instance with proper database connection
const createAuth = () => {
  
  return betterAuth({
    database: drizzleAdapter(db, {
      schema,
      provider: 'pg',
      usePlural: false,
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
};

// Export auth instance
export const auth = createAuth();

// Verify connection on module load (but don't block)
if (process.env.NODE_ENV !== 'test') {
  ensureDbConnection().then((connected) => {
    if (!connected) {
      console.warn('⚠️  Better Auth may not work properly without database connection');
    }
  });
}