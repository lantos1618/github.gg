ALTER TABLE "repository_scorecards" DROP COLUMN "version";
ALTER TABLE "repository_scorecards" ADD COLUMN "version" integer GENERATED ALWAYS AS IDENTITY NOT NULL;