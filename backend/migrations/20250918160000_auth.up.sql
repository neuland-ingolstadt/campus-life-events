-- Add email and password_hash to organizers (nullable for backward compatibility)
ALTER TABLE organizers
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Sessions table for cookie-based sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  organizer_id BIGINT NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_organizer_id ON sessions (organizer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

