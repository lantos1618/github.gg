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
  NEXT_PUBLIC_GITHUB_APP_ID: z.string().min(1),
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

  // Monetization
  API_KEY_ENCRYPTION_SECRET: z.string().length(32, 'Must be exactly 32 characters'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_BYOK_PRICE_ID: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env); 