DROP INDEX IF EXISTS idx_api_tokens_expires_at;

ALTER TABLE api_tokens
    DROP COLUMN IF EXISTS expires_at;
