-- Create Wiki Page Viewers table for tracking who views wiki pages
CREATE TABLE "wiki_page_viewers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"slug" text NOT NULL,
	"version" integer NOT NULL,
	"userId" text,
	"username" text,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp DEFAULT now() NOT NULL,
	"view_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraint
ALTER TABLE "wiki_page_viewers" ADD CONSTRAINT "wiki_page_viewers_userId_user_id_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create unique index for viewer per page version and user
CREATE UNIQUE INDEX "wiki_page_viewer_unique_idx" ON "wiki_page_viewers"
  USING btree ("repo_owner", "repo_name", "slug", "version", "userId");
--> statement-breakpoint

-- Create index for querying viewers by page
CREATE INDEX "wiki_page_viewers_idx" ON "wiki_page_viewers"
  USING btree ("repo_owner", "repo_name", "slug", "version");
