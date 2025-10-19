-- Normalize all usernames to lowercase to fix case-sensitivity issues
-- This prevents duplicate player records for the same GitHub user with different casing

-- Update developer_rankings table
UPDATE developer_rankings
SET username = LOWER(username)
WHERE username != LOWER(username);

-- Update developer_profile_cache table
UPDATE developer_profile_cache
SET username = LOWER(username)
WHERE username != LOWER(username);

-- Update developer_emails table
UPDATE developer_emails
SET username = LOWER(username)
WHERE username != LOWER(username);

-- Update arena_battles table (both challenger and opponent)
UPDATE arena_battles
SET challenger_username = LOWER(challenger_username)
WHERE challenger_username != LOWER(challenger_username);

UPDATE arena_battles
SET opponent_username = LOWER(opponent_username)
WHERE opponent_username != LOWER(opponent_username);

-- Update user_score_history table
UPDATE user_score_history
SET username = LOWER(username)
WHERE username != LOWER(username);
