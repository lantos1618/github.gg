-- Migration: Rename token_usage columns from promptTokens/completionTokens to inputTokens/outputTokens
-- This aligns with AI SDK v5 naming conventions

-- Rename columns
ALTER TABLE token_usage
  RENAME COLUMN prompt_tokens TO input_tokens;

ALTER TABLE token_usage
  RENAME COLUMN completion_tokens TO output_tokens;

-- No data migration needed - just renamed columns
