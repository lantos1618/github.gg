#!/bin/bash
# Script to normalize usernames in production database
# Run this on your production server or with production DATABASE_URL

echo "🚀 Running username normalization migration on production..."
echo ""
echo "⚠️  WARNING: This will normalize all usernames to lowercase in the production database."
echo "   Make sure you have a backup before proceeding!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Migration cancelled."
    exit 1
fi

# Run the migration script with production environment
bun scripts/migrate-normalize-usernames.ts

echo ""
echo "✅ Production migration complete!"
echo ""
echo "Run the verification script to check for duplicates:"
echo "  bun scripts/check-duplicate-usernames.ts"
