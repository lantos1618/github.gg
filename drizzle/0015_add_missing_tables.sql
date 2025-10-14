-- Create AI Slop Analyses table
CREATE TABLE "ai_slop_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"ref" text DEFAULT 'main',
	"version" integer NOT NULL,
	"overall_score" integer NOT NULL,
	"ai_generated_percentage" integer NOT NULL,
	"detected_patterns" jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"markdown" text NOT NULL,
	"file_hashes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create User Score History table
CREATE TABLE "user_score_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"username" text NOT NULL,
	"elo_rating" integer,
	"overall_score" integer,
	"source" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create Repo Score History table
CREATE TABLE "repo_score_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"ref" text DEFAULT 'main',
	"overall_score" integer NOT NULL,
	"metrics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create Webhook Preferences table
CREATE TABLE "webhook_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" integer NOT NULL UNIQUE,
	"pr_review_enabled" boolean DEFAULT true NOT NULL,
	"auto_update_enabled" boolean DEFAULT true NOT NULL,
	"min_score_threshold" integer,
	"excluded_repos" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create Repository Wiki Pages table
CREATE TABLE "repository_wiki_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"version" integer DEFAULT 1 NOT NULL,
	"file_hashes" jsonb,
	"metadata" jsonb,
	"is_public" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "ai_slop_analyses" ADD CONSTRAINT "ai_slop_analyses_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_score_history" ADD CONSTRAINT "user_score_history_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "webhook_preferences" ADD CONSTRAINT "webhook_preferences_installation_id_github_app_installations_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_app_installations"("installation_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create unique indexes
CREATE UNIQUE INDEX "ai_slop_unique_idx" ON "ai_slop_analyses" USING btree ("userId","repo_owner","repo_name","ref","version");
--> statement-breakpoint
CREATE UNIQUE INDEX "wiki_page_unique_idx" ON "repository_wiki_pages" USING btree ("repo_owner","repo_name","slug","version");
--> statement-breakpoint

-- Create regular indexes
CREATE INDEX "user_history_idx" ON "user_score_history" USING btree ("userId","created_at");
--> statement-breakpoint
CREATE INDEX "username_history_idx" ON "user_score_history" USING btree ("username","created_at");
--> statement-breakpoint
CREATE INDEX "repo_history_idx" ON "repo_score_history" USING btree ("repo_owner","repo_name","ref","created_at");
--> statement-breakpoint
CREATE INDEX "public_pages_idx" ON "repository_wiki_pages" USING btree ("is_public","repo_owner","repo_name");
