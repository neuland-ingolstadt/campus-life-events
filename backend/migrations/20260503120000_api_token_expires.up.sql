ALTER TABLE api_tokens
    ADD COLUMN expires_at TIMESTAMPTZ;

UPDATE api_tokens
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

ALTER TABLE api_tokens
    ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX idx_api_tokens_expires_at ON api_tokens (expires_at);
