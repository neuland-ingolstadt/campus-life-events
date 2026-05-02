DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'api_tokens'
          AND column_name = 'token'
    ) THEN
        ALTER TABLE api_tokens DROP CONSTRAINT IF EXISTS api_tokens_token_key;
        ALTER TABLE api_tokens DROP COLUMN token;
        TRUNCATE api_tokens RESTART IDENTITY;
    END IF;
END $$;

ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS token_hmac BYTEA;
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS token_last_four TEXT NOT NULL DEFAULT '';
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

ALTER TABLE api_tokens ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE api_tokens ALTER COLUMN token_hmac SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS api_tokens_token_hmac_key ON api_tokens (token_hmac);
CREATE INDEX IF NOT EXISTS idx_api_tokens_account_id ON api_tokens (account_id);
