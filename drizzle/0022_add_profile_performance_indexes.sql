CREATE INDEX CONCURRENTLY IF NOT EXISTS dpc_username_idx ON developer_profile_cache (username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS dpc_username_version_desc_idx ON developer_profile_cache (username, version);
