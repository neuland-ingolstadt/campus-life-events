-- ========== ENUM für Audit-Typ ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_type') THEN
    CREATE TYPE audit_type AS ENUM ('CREATE', 'UPDATE', 'DELETE');
  END IF;
END$$;

-- ========== ORGANIZERS ==========
CREATE TABLE IF NOT EXISTS organizers (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  description_de   TEXT,
  description_en   TEXT,
  website_url   TEXT,
  instagram_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== EVENTS ==========
CREATE TABLE IF NOT EXISTS events (
  id               BIGSERIAL PRIMARY KEY,
  organizer_id     BIGINT NOT NULL REFERENCES organizers(id) ON DELETE RESTRICT,
  title_de         TEXT NOT NULL,
  title_en         TEXT NOT NULL,
  description_de   TEXT,
  description_en   TEXT,
  start_date_time  TIMESTAMPTZ NOT NULL,
  end_date_time    TIMESTAMPTZ,
  event_url        TEXT,
  publish_app      BOOLEAN NOT NULL DEFAULT TRUE,
  publish_newsletter BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events (organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_start ON events (start_date_time);

-- ========== AUDIT LOG ==========
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  event_id    BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id BIGINT NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  type        audit_type NOT NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note        TEXT,             
  old_data    JSONB,           
  new_data    JSONB             
);

CREATE INDEX IF NOT EXISTS idx_audit_event_id ON audit_log (event_id);
