-- Revert shared accounts table back to organizer-specific credentials
ALTER TABLE organizers
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS super_user BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS setup_token TEXT,
  ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ;

-- restore credential data for organizer accounts
UPDATE organizers o
SET
  email = COALESCE(a.email, o.email),
  password_hash = COALESCE(a.password_hash, o.password_hash),
  setup_token = COALESCE(a.setup_token, o.setup_token),
  setup_token_expires_at = COALESCE(a.setup_token_expires_at, o.setup_token_expires_at),
  updated_at = NOW()
FROM accounts a
WHERE a.organizer_id = o.id
  AND a.account_type = 'ORGANIZER';

-- mark legacy super users
UPDATE organizers o
SET
  super_user = TRUE,
  email = COALESCE(o.email, a.email),
  password_hash = COALESCE(o.password_hash, a.password_hash)
FROM admins adm
JOIN accounts a ON a.id = adm.account_id
WHERE adm.legacy_organizer_id = o.id;

-- restore sessions linkage
ALTER TABLE sessions ADD COLUMN organizer_id BIGINT;

UPDATE sessions s
SET organizer_id = a.organizer_id
FROM accounts a
WHERE a.id = s.account_id
  AND a.account_type = 'ORGANIZER';

UPDATE sessions s
SET organizer_id = adm.legacy_organizer_id
FROM admins adm
JOIN accounts a ON a.id = adm.account_id
WHERE s.account_id = a.id
  AND adm.legacy_organizer_id IS NOT NULL;

ALTER TABLE sessions ALTER COLUMN organizer_id SET NOT NULL;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_account_id_fkey;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_sessions_account_id;
CREATE INDEX IF NOT EXISTS idx_sessions_organizer_id ON sessions (organizer_id);
ALTER TABLE sessions DROP COLUMN account_id;

DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS accounts;
DROP TYPE IF EXISTS account_type;
