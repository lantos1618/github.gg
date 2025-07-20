CREATE TABLE "repo_diagram_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"ref" text DEFAULT 'main',
	"diagram_type" text NOT NULL,
	"diagram_code" text NOT NULL,
	"options" jsonb,
	"file_hashes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repo_diagram_cache" ADD CONSTRAINT "repo_diagram_cache_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "diagram_unique_idx" ON "repo_diagram_cache" USING btree ("userId","repo_owner","repo_name","ref","diagram_type");