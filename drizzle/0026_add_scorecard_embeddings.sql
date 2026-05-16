-- pgvector is already enabled by 0021_add_profile_embeddings.sql; included for
-- idempotency if 0026 is the first migration run on a fresh DB after a squash.
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding column on repository_scorecards (Gemini text-embedding-004, 768 dims).
ALTER TABLE repository_scorecards ADD COLUMN IF NOT EXISTS embedding vector(768);

-- HNSW cosine index for fast approximate nearest neighbour search.
-- drizzle-kit doesn't emit HNSW indexes for pgvector custom types, so this is
-- hand-rolled (same as 0021_add_profile_embeddings.sql).
CREATE INDEX IF NOT EXISTS idx_scorecard_embedding ON repository_scorecards
USING hnsw (embedding vector_cosine_ops);
