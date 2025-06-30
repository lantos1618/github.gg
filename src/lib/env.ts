import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env.local for environments that don't automatically (e.g., bun test)
dotenv.config({ path: '.env.local' });


const envSchema = z.object({
  // Database connection string (Settings > Database in your cloud provider, or local Postgres)
  DATABASE_URL: z.string().url(),
  
  // GitHub OAuth App credentials (GitHub > Settings > Developer settings > OAuth Apps)
  GITHUB_CLIENT_ID: z.string().min(1), // Found in your GitHub OAuth App
  GITHUB_CLIENT_SECRET: z.string().min(1), // Found in your GitHub OAuth App
  
  // GitHub API key (if using a public API key for requests)
  GITHUB_PUBLIC_API_KEY: z.string().min(1),
  
  // GitHub App Configuration (GitHub > Settings > Developer settings > GitHub Apps)
  GITHUB_APP_ID: z.string().min(1), // GitHub App > General > App ID
  GITHUB_APP_NAME: z.string().min(1), // GitHub App > General > App name
  NEXT_PUBLIC_GITHUB_APP_NAME: z.string().min(1), // Exposed to frontend
  NEXT_PUBLIC_GITHUB_APP_ID: z.string().min(1), // Exposed to frontend
  GITHUB_WEBHOOK_SECRET: z.string().min(1), // GitHub App > Webhooks > Webhook secret
  GITHUB_PRIVATE_KEY: z.string().min(1), // GitHub App > Private key (paste PEM contents)
  
  // Gemini API Key (Google AI Studio > API Keys)
  GEMINI_API_KEY: z.string().min(1),
  
  // Auth secret (generate with `openssl rand -base64 32` or similar)
  BETTER_AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),
  
  // App URL (your deployed frontend URL, e.g. https://dev.github.gg)
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // PostHog Analytics (PostHog project > Setup > API key & host)
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().min(1),

  // Monetization / Stripe
  //  - STRIPE_SECRET_KEY: Stripe dashboard > Developers > API keys > Secret key
  //  - STRIPE_WEBHOOK_SECRET: Stripe CLI or dashboard > Webhooks > Signing secret
  //  - STRIPE_BYOK_PRICE_ID: Stripe dashboard > Products > BYOK plan > Price ID
  //  - STRIPE_PRO_PRICE_ID: Stripe dashboard > Products > Pro plan > Price ID
  //  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Stripe dashboard > Developers > API keys > Publishable key
  API_KEY_ENCRYPTION_SECRET: z.string().length(32, 'Must be exactly 32 characters'), // Generate with `openssl rand -hex 16`
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_BYOK_PRICE_ID: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env); 