ALTER TABLE accounts
    DROP COLUMN IF EXISTS previous_login_at,
    DROP COLUMN IF EXISTS last_login_at;
