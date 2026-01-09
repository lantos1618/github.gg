-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to developer_profile_cache
-- Using 768 dimensions for Gemini text-embedding-004 model
ALTER TABLE developer_profile_cache ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create index for fast cosine similarity search
-- Using HNSW index which is more efficient for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_profile_embedding ON developer_profile_cache
USING hnsw (embedding vector_cosine_ops);

-- Add index on username for fast lookups (already exists but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_profile_username ON developer_profile_cache(username);
