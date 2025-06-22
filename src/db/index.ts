import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

const connectionString = env.DATABASE_URL;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

async function checkDbConnection() {
  try {
    // A simple query to check the connection
    await client`select 1`;
    console.log('✅ Database connection successful.');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    // Exit the process with an error code
    process.exit(1);
  }
}

// Only run the check if not in a test environment
if (process.env.NODE_ENV !== 'test') {
  checkDbConnection();
} 