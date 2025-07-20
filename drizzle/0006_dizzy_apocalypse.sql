CREATE TABLE "repository_diagrams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"ref" text DEFAULT 'main',
	"diagram_type" text NOT NULL,
	"diagram_code" text NOT NULL,
	"format" text DEFAULT 'mermaid' NOT NULL,
	"options" jsonb,
	"file_hashes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_scorecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"ref" text DEFAULT 'main',
	"overall_score" integer NOT NULL,
	"metrics" jsonb NOT NULL,
	"markdown" text NOT NULL,
	"file_hashes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "repo_diagram_cache" CASCADE;--> statement-breakpoint
DROP TABLE "repo_scorecard_cache" CASCADE;--> statement-breakpoint
ALTER TABLE "repository_diagrams" ADD CONSTRAINT "repository_diagrams_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_scorecards" ADD CONSTRAINT "repository_scorecards_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "diagram_unique_idx" ON "repository_diagrams" USING btree ("userId","repo_owner","repo_name","ref","diagram_type");--> statement-breakpoint
CREATE UNIQUE INDEX "scorecard_unique_idx" ON "repository_scorecards" USING btree ("userId","repo_owner","repo_name","ref");