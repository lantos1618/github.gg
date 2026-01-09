-- Public API Keys for REST API access
CREATE TABLE IF NOT EXISTS "public_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "key_hash" text NOT NULL UNIQUE,
  "key_prefix" text NOT NULL,
  "scopes" text[] NOT NULL DEFAULT ARRAY['read']::text[],
  "rate_limit" integer NOT NULL DEFAULT 100,
  "is_active" boolean NOT NULL DEFAULT true,
  "last_used_at" timestamp,
  "expires_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- API Key usage tracking
CREATE TABLE IF NOT EXISTS "api_key_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key_id" uuid NOT NULL REFERENCES "public_api_keys"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "method" text NOT NULL,
  "status_code" integer NOT NULL,
  "response_time_ms" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS "idx_public_api_keys_key_hash" ON "public_api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "idx_public_api_keys_user_id" ON "public_api_keys"("user_id");
CREATE INDEX IF NOT EXISTS "idx_api_key_usage_key_id" ON "api_key_usage"("key_id");
CREATE INDEX IF NOT EXISTS "idx_api_key_usage_created_at" ON "api_key_usage"("created_at");
