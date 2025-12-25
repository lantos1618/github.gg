-- Add is_private column to repository_scorecards to track private repos
-- This prevents private repos from appearing in public listings
ALTER TABLE "repository_scorecards" ADD COLUMN IF NOT EXISTS "is_private" boolean DEFAULT false NOT NULL;

-- Create index for efficient filtering of public repos
CREATE INDEX IF NOT EXISTS "scorecards_public_idx" ON "repository_scorecards" ("is_private", "updated_at" DESC);
