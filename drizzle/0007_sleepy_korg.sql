CREATE TABLE "developer_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"first_found_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"source_repo" text,
	CONSTRAINT "developer_emails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DROP INDEX "username_idx";--> statement-breakpoint
DROP INDEX "diagram_unique_idx";--> statement-breakpoint
DROP INDEX "scorecard_unique_idx";--> statement-breakpoint
ALTER TABLE "developer_profile_cache" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "repository_diagrams" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "repository_scorecards" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "username_idx" ON "developer_profile_cache" USING btree ("username","version");--> statement-breakpoint
CREATE UNIQUE INDEX "diagram_unique_idx" ON "repository_diagrams" USING btree ("userId","repo_owner","repo_name","ref","diagram_type","version");--> statement-breakpoint
CREATE UNIQUE INDEX "scorecard_unique_idx" ON "repository_scorecards" USING btree ("userId","repo_owner","repo_name","ref","version");