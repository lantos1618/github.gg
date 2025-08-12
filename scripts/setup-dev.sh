#!/bin/bash

# GitHub.gg Development Setup Script
# This script helps you set up the project for local development

set -e

echo "🚀 Setting up GitHub.gg for local development..."

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   https://bun.sh/docs/installation"
    exit 1
fi

echo "✅ Bun is installed"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is installed"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << 'EOF'
# =============================================================================
# GitHub.gg Local Development Environment
# =============================================================================

# Database Configuration (auto-configured by Docker)
DATABASE_URL="postgresql://github_gg_user:github_gg_password@localhost:5432/github_gg"

# Authentication (generate a random 32-character string)
BETTER_AUTH_SECRET="dev-secret-key-for-local-development-only"

# GitHub OAuth App Configuration
# Create a GitHub OAuth App at: https://github.com/settings/developers
# Homepage URL: http://localhost:3000
# Authorization callback URL: http://localhost:3000/api/auth/callback/github
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"

# App URL Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: GitHub API for unauthenticated requests
# GITHUB_PUBLIC_API_KEY="your-github-personal-access-token"

# Optional: AI Features (Google Gemini)
# GEMINI_API_KEY="your-gemini-api-key"

# Optional: Payment Integration (Stripe)
# STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
# STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret"
# STRIPE_BYOK_PRICE_ID="price_your_byok_plan_id"
# STRIPE_PRO_PRICE_ID="price_your_pro_plan_id"
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"

# Optional: Analytics (PostHog)
# NEXT_PUBLIC_POSTHOG_KEY="your_posthog_key"
# NEXT_PUBLIC_POSTHOG_HOST="https://eu.i.posthog.com"

# Development Mode
NODE_ENV="development"
DEBUG="false"

# Development Authentication (enables JWT-based auth instead of GitHub OAuth)
# Set to "false" to use GitHub OAuth in development
NEXT_PUBLIC_USE_DEV_AUTH="true"
EOF
    echo "✅ Created .env.local file"
    echo "⚠️  Please update the GitHub OAuth credentials in .env.local"
else
    echo "✅ .env.local already exists"
fi

# Start database
echo "🗄️  Starting PostgreSQL database..."
bun run db:start

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run database migrations
echo "🔄 Running database migrations..."
bun run db:push

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your GitHub OAuth credentials"
echo "2. Run 'bun dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "Optional:"
echo "- Add GITHUB_PUBLIC_API_KEY for enhanced features"
echo "- Add GEMINI_API_KEY for AI analysis features"
echo "- Add Stripe keys for payment features"
echo ""
echo "For more information, see README.md" 