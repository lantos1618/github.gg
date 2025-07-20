CREATE TABLE "repo_scorecard_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"ref" text DEFAULT 'main',
	"scorecard_data" jsonb NOT NULL,
	"file_hashes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repo_scorecard_cache" ADD CONSTRAINT "repo_scorecard_cache_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scorecard_unique_idx" ON "repo_scorecard_cache" USING btree ("userId","repo_owner","repo_name","ref");