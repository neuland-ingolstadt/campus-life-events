CREATE TABLE api_tokens (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hmac BYTEA NOT NULL UNIQUE,
    label TEXT NOT NULL DEFAULT '',
    token_last_four TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_api_tokens_account_id ON api_tokens(account_id);
