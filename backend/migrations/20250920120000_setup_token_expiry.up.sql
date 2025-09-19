ALTER TABLE organizers
  ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMPTZ;

UPDATE organizers
SET setup_token_expires_at = NOW() + INTERVAL '7 days'
WHERE setup_token IS NOT NULL
  AND setup_token_expires_at IS NULL;
