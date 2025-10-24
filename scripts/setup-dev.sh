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
    cp .env.example .env.local
    echo "✅ Created .env.local file from .env.example"
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