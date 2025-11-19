/**
 * Environment variable validation
 * Run at application startup to ensure all required vars are set
 */

const requiredEnvVars = {
  development: [
    'DATABASE_URL',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'BETTER_AUTH_SECRET',
    'API_KEY_ENCRYPTION_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ],
  production: [
    'DATABASE_URL',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'BETTER_AUTH_SECRET',
    'API_KEY_ENCRYPTION_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ],
};

const optionalEnvVars = [
  'GEMINI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_BYOK_PRICE_ID',
  'STRIPE_PRO_PRICE_ID',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'GITHUB_WEBHOOK_SECRET',
  'ADMIN_EMAILS',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
];

export function validateEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env as keyof typeof requiredEnvVars] || requiredEnvVars.development;
  
  const missing: string[] = [];
  
  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Warn about optional but recommended vars
  const notSet = optionalEnvVars.filter(v => !process.env[v]);
  if (notSet.length > 0 && env === 'production') {
    console.warn('⚠️  Optional environment variables not set in production:');
    notSet.forEach(v => console.warn(`   - ${v}`));
  }
  
  console.log('✅ Environment validation passed');
}
