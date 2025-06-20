#!/bin/bash

echo "🚀 Setting up GitHub.gg database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start the database
echo "📦 Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose exec -T postgres pg_isready -U github_gg_user -d github_gg; do
    echo "Database is not ready yet. Waiting..."
    sleep 2
done

echo "✅ Database is ready!"

# Generate and push database schema
echo "🔄 Generating database schema..."
bun run db:generate

echo "📤 Pushing schema to database..."
bun run db:push

echo "🎉 Database setup complete!"
echo ""
echo "You can now start the development server with:"
echo "bun dev"
echo ""
echo "To stop the database:"
echo "docker-compose down" 