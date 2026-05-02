-- Free-tier review counter per GitHub App installation.
-- Tracks N free PR/commit/issue reviews using the platform key before paywall.

CREATE TABLE IF NOT EXISTS "installation_free_reviews" (
  "installation_id" integer PRIMARY KEY NOT NULL,
  "used" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "installation_free_reviews"
    ADD CONSTRAINT "installation_free_reviews_installation_id_github_app_installations_installation_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "github_app_installations"("installation_id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
