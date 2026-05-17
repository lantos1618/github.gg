-- UMAP 2-D projection columns for developer_profile_cache.
-- Populated by scripts/compute-umap-projection.ts; read by discover.getAllGGProfileNodes.
ALTER TABLE developer_profile_cache ADD COLUMN IF NOT EXISTS projection_x real;
ALTER TABLE developer_profile_cache ADD COLUMN IF NOT EXISTS projection_y real;
ALTER TABLE developer_profile_cache ADD COLUMN IF NOT EXISTS projection_version integer;
