CREATE TABLE "security_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"ref" text DEFAULT 'main',
	"version" integer NOT NULL,
	"overall_score" integer NOT NULL,
	"risk_level" text NOT NULL,
	"vulnerabilities" jsonb NOT NULL,
	"attack_surface" jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"markdown" text NOT NULL,
	"file_hashes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "security_reviews" ADD CONSTRAINT "security_reviews_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "security_review_unique_idx" ON "security_reviews" USING btree ("userId","repo_owner","repo_name","ref","version");
