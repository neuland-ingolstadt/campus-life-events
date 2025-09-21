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
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  setup_token TEXT UNIQUE,
  setup_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (account_type = 'ORGANIZER' AND organizer_id IS NOT NULL)
    OR (account_type = 'ADMIN')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_organizer_id
  ON accounts(organizer_id) WHERE account_type = 'ORGANIZER';
CREATE INDEX IF NOT EXISTS idx_accounts_account_type
  ON accounts(account_type);

INSERT INTO accounts (
  account_type,
  organizer_id,
  display_name,
  email,
  password_hash,
  setup_token,
  setup_token_expires_at,
  created_at,
  updated_at
)
SELECT
  CASE WHEN COALESCE(o.super_user, FALSE) THEN 'ADMIN'::account_type ELSE 'ORGANIZER'::account_type END,
  o.id,
  o.name,
  o.email,
  o.password_hash,
  o.setup_token,
  o.setup_token_expires_at,
  o.created_at,
  o.updated_at
FROM organizers o
ON CONFLICT (email) DO NOTHING;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS account_id BIGINT;

UPDATE sessions s
SET account_id = a.id
FROM accounts a
WHERE s.organizer_id = a.organizer_id;

ALTER TABLE sessions
  ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions(account_id);

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_organizer_id_fkey;
DROP INDEX IF EXISTS idx_sessions_organizer_id;
ALTER TABLE sessions
  DROP COLUMN IF EXISTS organizer_id;

ALTER TABLE organizers
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS setup_token,
  DROP COLUMN IF EXISTS setup_token_expires_at,
  DROP COLUMN IF EXISTS super_user;
