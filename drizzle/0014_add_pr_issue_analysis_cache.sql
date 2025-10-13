-- Rename token_usage columns for consistency
ALTER TABLE "token_usage" RENAME COLUMN "prompt_tokens" TO "input_tokens";
ALTER TABLE "token_usage" RENAME COLUMN "completion_tokens" TO "output_tokens";

-- Create PR Analysis Cache table
CREATE TABLE "pr_analysis_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"pr_number" integer NOT NULL,
	"version" integer NOT NULL,
	"overall_score" integer NOT NULL,
	"analysis" jsonb NOT NULL,
	"markdown" text NOT NULL,
	"pr_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create Issue Analysis Cache table
CREATE TABLE "issue_analysis_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"issue_number" integer NOT NULL,
	"version" integer NOT NULL,
	"overall_score" integer NOT NULL,
	"slop_ranking" integer NOT NULL,
	"suggested_priority" text NOT NULL,
	"analysis" jsonb NOT NULL,
	"markdown" text NOT NULL,
	"issue_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "pr_analysis_cache" ADD CONSTRAINT "pr_analysis_cache_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_analysis_cache" ADD CONSTRAINT "issue_analysis_cache_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create unique indexes
CREATE UNIQUE INDEX "pr_analysis_unique_idx" ON "pr_analysis_cache" USING btree ("userId","repo_owner","repo_name","pr_number","version");
--> statement-breakpoint
CREATE UNIQUE INDEX "issue_analysis_unique_idx" ON "issue_analysis_cache" USING btree ("userId","repo_owner","repo_name","issue_number","version");
