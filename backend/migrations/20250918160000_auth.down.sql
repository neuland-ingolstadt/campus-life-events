DROP TABLE IF EXISTS sessions;

ALTER TABLE organizers
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS email;

