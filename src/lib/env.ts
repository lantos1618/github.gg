import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env.local for environments that don't automatically (e.g., bun test)
dotenv.config({ path: '.env.local' });


const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  
  // GitHub API
  GITHUB_PUBLIC_API_KEY: z.string().min(1),
  
  // GitHub App Configuration
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_GITHUB_APP_NAME: z.string().min(1),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
  GITHUB_PRIVATE_KEY: z.string().min(1),
  
  // AI Analysis
  GEMINI_API_KEY: z.string().min(1),
  
  // Auth
  BETTER_AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),
  
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Analytics
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().min(1),
});

export const env = envSchema.parse(process.env); 