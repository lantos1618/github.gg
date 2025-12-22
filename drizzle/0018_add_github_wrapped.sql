CREATE TABLE "github_wrapped" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"year" integer NOT NULL,
	"stats" jsonb NOT NULL,
	"ai_insights" jsonb,
	"badge_theme" text DEFAULT 'dark',
	"is_public" boolean DEFAULT true,
	"share_code" text UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "wrapped_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_id" text NOT NULL,
	"inviter_username" text NOT NULL,
	"invitee_username" text,
	"invite_code" text NOT NULL UNIQUE,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint

CREATE TABLE "wrapped_badge_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wrapped_id" uuid NOT NULL,
	"username" text NOT NULL,
	"badge_type" text NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"referrer" text,
	"clicked" boolean DEFAULT false
);
--> statement-breakpoint

ALTER TABLE "github_wrapped" ADD CONSTRAINT "github_wrapped_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "wrapped_invites" ADD CONSTRAINT "wrapped_invites_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "wrapped_badge_views" ADD CONSTRAINT "wrapped_badge_views_wrapped_id_github_wrapped_id_fk" FOREIGN KEY ("wrapped_id") REFERENCES "public"."github_wrapped"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "wrapped_user_year_idx" ON "github_wrapped" USING btree ("user_id","year");
--> statement-breakpoint
CREATE INDEX "wrapped_username_year_idx" ON "github_wrapped" USING btree ("username","year");
--> statement-breakpoint
CREATE INDEX "wrapped_share_code_idx" ON "github_wrapped" USING btree ("share_code");
--> statement-breakpoint
CREATE INDEX "wrapped_invite_code_idx" ON "wrapped_invites" USING btree ("invite_code");
--> statement-breakpoint
CREATE INDEX "wrapped_inviter_idx" ON "wrapped_invites" USING btree ("inviter_id");
--> statement-breakpoint
CREATE INDEX "wrapped_badge_view_time_idx" ON "wrapped_badge_views" USING btree ("wrapped_id","viewed_at");
