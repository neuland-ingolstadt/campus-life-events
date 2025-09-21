-- ========== ENUMS ==========
CREATE TYPE audit_type AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE TYPE account_type AS ENUM ('ADMIN', 'ORGANIZER');

-- ========== ORGANIZERS ==========
CREATE TABLE organizers (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  description_de   TEXT,
  description_en   TEXT,
  website_url   TEXT,
  instagram_url TEXT,
  location      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== EVENTS ==========
CREATE TABLE events (
  id               BIGSERIAL PRIMARY KEY,
  organizer_id     BIGINT NOT NULL REFERENCES organizers(id) ON DELETE RESTRICT,
  title_de         TEXT NOT NULL,
  title_en         TEXT NOT NULL,
  description_de   TEXT,
  description_en   TEXT,
  start_date_time  TIMESTAMPTZ NOT NULL,
  end_date_time    TIMESTAMPTZ,
  event_url        TEXT,
  location         TEXT,
  publish_app      BOOLEAN NOT NULL DEFAULT TRUE,
  publish_newsletter BOOLEAN NOT NULL DEFAULT TRUE,
  publish_in_ical  BOOLEAN NOT NULL DEFAULT TRUE,
  publish_web      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== ACCOUNTS ==========
CREATE TABLE accounts (
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

-- ========== SESSIONS ==========
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ========== PASSWORD RESET TOKENS ==========
CREATE TABLE password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== AUDIT LOG ==========
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  event_id    BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id BIGINT NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  user_id     BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  type        audit_type NOT NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note        TEXT,             
  old_data    JSONB,           
  new_data    JSONB             
);

-- ========== INDEXES ==========
-- Organizers indexes
-- (name is already unique via constraint)

-- Events indexes
CREATE INDEX idx_events_organizer_id ON events (organizer_id);
CREATE INDEX idx_events_start ON events (start_date_time);

-- Accounts indexes
CREATE UNIQUE INDEX idx_accounts_organizer_id
  ON accounts(organizer_id) WHERE account_type = 'ORGANIZER';
CREATE INDEX idx_accounts_account_type ON accounts(account_type);

-- Sessions indexes
CREATE INDEX idx_sessions_account_id ON sessions (account_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

-- Password reset tokens indexes
CREATE INDEX idx_password_reset_tokens_account_id ON password_reset_tokens (account_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens (token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);
CREATE INDEX idx_password_reset_tokens_cleanup ON password_reset_tokens (expires_at) WHERE used_at IS NULL;

-- Audit log indexes
CREATE INDEX idx_audit_event_id ON audit_log (event_id);
CREATE INDEX idx_audit_user_id ON audit_log (user_id);
