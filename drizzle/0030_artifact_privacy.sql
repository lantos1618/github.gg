-- Legacy analyses have no reliable visibility provenance. Quarantine them as
-- private so a later private-to-public repository transition cannot publish
-- output generated from formerly private source.
ALTER TABLE repository_diagrams ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT true;
ALTER TABLE ai_slop_analyses ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT true;
ALTER TABLE security_reviews ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT true;
ALTER TABLE pr_analysis_cache ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT true;
ALTER TABLE issue_analysis_cache ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT true;
