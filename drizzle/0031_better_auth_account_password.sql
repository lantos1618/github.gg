-- Better Auth validates the full core account shape at startup, including
-- this nullable field even when the app uses GitHub login only.
ALTER TABLE account ADD COLUMN IF NOT EXISTS password text;
