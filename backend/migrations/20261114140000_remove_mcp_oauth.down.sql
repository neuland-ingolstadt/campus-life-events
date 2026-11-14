ALTER TABLE audit_log ALTER COLUMN source DROP DEFAULT;

CREATE TYPE audit_source_old AS ENUM ('UI', 'MCP', 'API');

ALTER TABLE audit_log
    ALTER COLUMN source TYPE audit_source_old
    USING (source::text::audit_source_old);

DROP TYPE audit_source;
ALTER TYPE audit_source_old RENAME TO audit_source;

ALTER TABLE audit_log
    ALTER COLUMN source SET DEFAULT 'UI'::audit_source;

CREATE TABLE oauth_clients (
    id UUID PRIMARY KEY,
    client_name TEXT,
    redirect_uris TEXT[] NOT NULL,
    token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_authorization_codes (
    code_hmac BYTEA PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    redirect_uri TEXT NOT NULL,
    code_challenge TEXT NOT NULL,
    code_challenge_method TEXT NOT NULL,
    resource TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_authorization_codes_expires_at
    ON oauth_authorization_codes (expires_at);

CREATE TABLE oauth_tokens (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    access_token_hmac BYTEA NOT NULL,
    refresh_token_hmac BYTEA NOT NULL,
    access_expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX oauth_tokens_access_token_hmac_key
    ON oauth_tokens (access_token_hmac);
CREATE UNIQUE INDEX oauth_tokens_refresh_token_hmac_key
    ON oauth_tokens (refresh_token_hmac);
CREATE INDEX idx_oauth_tokens_account_id ON oauth_tokens (account_id);
CREATE INDEX idx_oauth_tokens_client_id ON oauth_tokens (client_id);

CREATE TABLE oauth_pending_requests (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    redirect_uri TEXT NOT NULL,
    code_challenge TEXT NOT NULL,
    code_challenge_method TEXT NOT NULL,
    state TEXT,
    resource TEXT,
    scope TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    issuer TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_oauth_pending_requests_expires_at
    ON oauth_pending_requests (expires_at);
