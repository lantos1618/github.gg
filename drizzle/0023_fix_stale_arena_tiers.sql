-- Fix stale arena tiers: determineTier() was broken (always returned Bronze)
-- Recompute tier from elo_rating using the correct tier thresholds
UPDATE developer_rankings SET tier = CASE
  WHEN elo_rating >= 2000 THEN 'Master'
  WHEN elo_rating >= 1800 THEN 'Diamond'
  WHEN elo_rating >= 1600 THEN 'Platinum'
  WHEN elo_rating >= 1400 THEN 'Gold'
  WHEN elo_rating >= 1200 THEN 'Silver'
  ELSE 'Bronze'
END
WHERE tier = 'Bronze' AND elo_rating >= 1200;
