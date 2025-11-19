-- Add performance indexes for frequently queried fields

-- User-related indexes for fast lookups
CREATE INDEX IF NOT EXISTS "user_github_id_idx" ON "user" ("github_id");
CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user" ("email");

-- Repository cache indexes
CREATE INDEX IF NOT EXISTS "cached_repos_user_id_idx" ON "cached_repos" ("user_id");
CREATE INDEX IF NOT EXISTS "cached_repos_owner_name_idx" ON "cached_repos" ("owner", "name");

-- GitHub app installation indexes
CREATE INDEX IF NOT EXISTS "installation_repos_installation_id_idx" ON "installation_repositories" ("installation_id");
CREATE INDEX IF NOT EXISTS "installation_repos_repo_id_idx" ON "installation_repositories" ("repository_id");

-- Analysis cache indexes for fast lookups by user
CREATE INDEX IF NOT EXISTS "pr_analysis_user_idx" ON "pr_analysis_cache" ("user_id");
CREATE INDEX IF NOT EXISTS "pr_analysis_repo_idx" ON "pr_analysis_cache" ("repo_owner", "repo_name");
CREATE INDEX IF NOT EXISTS "issue_analysis_user_idx" ON "issue_analysis_cache" ("user_id");
CREATE INDEX IF NOT EXISTS "issue_analysis_repo_idx" ON "issue_analysis_cache" ("repo_owner", "repo_name");

-- Scorecard indexes
CREATE INDEX IF NOT EXISTS "scorecard_user_idx" ON "repository_scorecards" ("user_id");
CREATE INDEX IF NOT EXISTS "scorecard_repo_idx" ON "repository_scorecards" ("repo_owner", "repo_name");

-- Insights cache indexes
CREATE INDEX IF NOT EXISTS "insights_user_idx" ON "insights_cache" ("user_id");
CREATE INDEX IF NOT EXISTS "insights_repo_idx" ON "insights_cache" ("repo_owner", "repo_name");

-- Arena and developer ranking indexes
CREATE INDEX IF NOT EXISTS "dev_ranking_user_idx" ON "developer_rankings" ("user_id");
CREATE INDEX IF NOT EXISTS "dev_ranking_elo_idx" ON "developer_rankings" ("elo_rating" DESC);
CREATE INDEX IF NOT EXISTS "arena_battle_created_idx" ON "arena_battles" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "arena_battle_player_idx" ON "arena_battles" ("player_1_id", "player_2_id");

-- Email subscription indexes
CREATE INDEX IF NOT EXISTS "developer_emails_user_idx" ON "developer_emails" ("user_id");

-- Token usage indexes for rate limiting
CREATE INDEX IF NOT EXISTS "token_usage_user_idx" ON "token_usage" ("user_id");
CREATE INDEX IF NOT EXISTS "token_usage_date_idx" ON "token_usage" ("date_used" DESC);

-- Wiki viewer indexes
CREATE INDEX IF NOT EXISTS "wiki_viewer_user_idx" ON "wiki_page_viewers" ("user_id");
CREATE INDEX IF NOT EXISTS "wiki_viewer_page_idx" ON "wiki_page_viewers" ("owner", "repo", "slug");

-- API key indexes for authentication
CREATE INDEX IF NOT EXISTS "api_key_user_idx" ON "api_keys" ("user_id");
CREATE INDEX IF NOT EXISTS "api_key_hash_idx" ON "api_keys" ("key_hash");
