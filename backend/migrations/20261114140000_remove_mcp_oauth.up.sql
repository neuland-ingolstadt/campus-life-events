DROP TABLE IF EXISTS oauth_tokens;
DROP TABLE IF EXISTS oauth_authorization_codes;
DROP TABLE IF EXISTS oauth_pending_requests;
DROP TABLE IF EXISTS oauth_clients;

ALTER TABLE audit_log ALTER COLUMN source DROP DEFAULT;

CREATE TYPE audit_source_new AS ENUM ('UI', 'API');

ALTER TABLE audit_log
    ALTER COLUMN source TYPE audit_source_new
    USING (
        CASE
            WHEN source::text = 'MCP' THEN 'UI'::audit_source_new
            ELSE source::text::audit_source_new
        END
    );

DROP TYPE audit_source;
ALTER TYPE audit_source_new RENAME TO audit_source;

ALTER TABLE audit_log
    ALTER COLUMN source SET DEFAULT 'UI'::audit_source;
