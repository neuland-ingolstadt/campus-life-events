ALTER TABLE oauth_tokens
    DROP COLUMN IF EXISTS last_used_at;
