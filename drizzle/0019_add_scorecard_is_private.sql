-- Add is_private column to repository_scorecards to track private repos
-- Default TRUE for safety: hide all existing repos until verified as public
-- This prevents private repo leaks during migration
ALTER TABLE "repository_scorecards" ADD COLUMN IF NOT EXISTS "is_private" boolean DEFAULT true NOT NULL;

-- Create index for efficient filtering of public repos
CREATE INDEX IF NOT EXISTS "scorecards_public_idx" ON "repository_scorecards" ("is_private", "updated_at" DESC);
