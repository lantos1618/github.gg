CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text,
	"category" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arena_battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenger_id" text NOT NULL,
	"opponent_id" text NOT NULL,
	"challenger_username" text NOT NULL,
	"opponent_username" text NOT NULL,
	"winner_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"battle_type" text DEFAULT 'standard' NOT NULL,
	"criteria" jsonb,
	"scores" jsonb,
	"ai_analysis" jsonb,
	"elo_change" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "developer_rankings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text,
	"username" text NOT NULL,
	"elo_rating" integer DEFAULT 1200 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"total_battles" integer DEFAULT 0 NOT NULL,
	"win_streak" integer DEFAULT 0 NOT NULL,
	"best_win_streak" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"tier" text DEFAULT 'Bronze' NOT NULL,
	"last_battle_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"seed" integer,
	"final_rank" integer,
	"eliminated" boolean DEFAULT false NOT NULL,
	"eliminated_at" timestamp,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"tournament_type" text DEFAULT 'single_elimination' NOT NULL,
	"max_participants" integer,
	"current_participants" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"prize_pool" jsonb,
	"rules" jsonb,
	"brackets" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"achievement_id" uuid NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "arena_battles" ADD CONSTRAINT "arena_battles_challenger_id_user_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_battles" ADD CONSTRAINT "arena_battles_opponent_id_user_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_battles" ADD CONSTRAINT "arena_battles_winner_id_user_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_rankings" ADD CONSTRAINT "developer_rankings_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battle_history_idx" ON "arena_battles" USING btree ("challenger_id","opponent_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "username_ranking_idx" ON "developer_rankings" USING btree ("username");--> statement-breakpoint
CREATE INDEX "elo_rating_idx" ON "developer_rankings" USING btree ("elo_rating");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_participant_idx" ON "tournament_participants" USING btree ("tournament_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_achievement_idx" ON "user_achievements" USING btree ("user_id","achievement_id");