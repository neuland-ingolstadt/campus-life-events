ALTER TABLE oauth_pending_requests
    ADD COLUMN IF NOT EXISTS issuer TEXT NOT NULL DEFAULT '';
