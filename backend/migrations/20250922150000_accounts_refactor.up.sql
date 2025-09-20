-- Introduce shared accounts table for organizer and admin access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('ADMIN', 'ORGANIZER');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  account_type account_type NOT NULL,
  organizer_id BIGINT REFERENCES organizers(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  password_hash TEXT,
  setup_token TEXT,
  setup_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (account_type = 'ORGANIZER' AND organizer_id IS NOT NULL)
    OR (account_type = 'ADMIN' AND organizer_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_organizer_id_unique
  ON accounts (organizer_id)
  WHERE organizer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legacy_organizer_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- migrate existing organizer accounts (exclude former super users)
INSERT INTO accounts (
  account_type,
  organizer_id,
  email,
  password_hash,
  setup_token,
  setup_token_expires_at,
  created_at,
  updated_at
)
SELECT
  'ORGANIZER',
  o.id,
  o.email,
  o.password_hash,
  o.setup_token,
  o.setup_token_expires_at,
  o.created_at,
  o.updated_at
FROM organizers o
WHERE o.super_user IS DISTINCT FROM TRUE;

-- promote former super users to admin accounts
INSERT INTO accounts (
  account_type,
  email,
  password_hash,
  created_at,
  updated_at
)
SELECT
  'ADMIN',
  o.email,
  o.password_hash,
  o.created_at,
  o.updated_at
FROM organizers o
WHERE o.super_user = TRUE;

INSERT INTO admins (account_id, name, legacy_organizer_id, created_at, updated_at)
SELECT a.id, o.name, o.id, o.created_at, o.updated_at
FROM organizers o
JOIN accounts a ON a.email = o.email AND a.account_type = 'ADMIN';

-- re-key sessions to accounts
ALTER TABLE sessions ADD COLUMN account_id BIGINT;

UPDATE sessions s
SET account_id = a.id
FROM accounts a
WHERE a.organizer_id = s.organizer_id
  AND a.account_type = 'ORGANIZER';

UPDATE sessions s
SET account_id = a.id
FROM accounts a
JOIN organizers o ON o.id = s.organizer_id
WHERE o.super_user = TRUE
  AND a.account_type = 'ADMIN'
  AND a.email = o.email;

ALTER TABLE sessions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_organizer_id_fkey;
ALTER TABLE sessions DROP COLUMN organizer_id;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_sessions_organizer_id;
CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions (account_id);

-- remove credential fields from organizers
ALTER TABLE organizers
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS super_user,
  DROP COLUMN IF EXISTS setup_token,
  DROP COLUMN IF EXISTS setup_token_expires_at;
