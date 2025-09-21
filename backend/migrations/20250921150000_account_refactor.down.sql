ALTER TABLE organizers
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS setup_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS super_user BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE organizers o
SET
  email = a.email,
  password_hash = a.password_hash,
  setup_token = a.setup_token,
  setup_token_expires_at = a.setup_token_expires_at,
  super_user = CASE WHEN a.account_type = 'ADMIN' THEN TRUE ELSE super_user END,
  updated_at = GREATEST(o.updated_at, COALESCE(a.updated_at, o.updated_at))
FROM accounts a
WHERE a.organizer_id = o.id;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS organizer_id BIGINT;

UPDATE sessions s
SET organizer_id = a.organizer_id
FROM accounts a
WHERE s.account_id = a.id;

ALTER TABLE sessions
  ALTER COLUMN organizer_id SET NOT NULL;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_organizer_id_fkey
  FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sessions_organizer_id ON sessions(organizer_id);

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_account_id_fkey;
DROP INDEX IF EXISTS idx_sessions_account_id;
ALTER TABLE sessions
  DROP COLUMN IF EXISTS account_id;

DROP TABLE IF EXISTS accounts;
DROP TYPE IF EXISTS account_type;
