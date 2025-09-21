-- Add user_id field to audit_log table to track who made the change
ALTER TABLE audit_log ADD COLUMN user_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log (user_id);

-- Update existing records to set user_id to NULL (we don't have historical data)
-- This is acceptable since it's a new field and existing records will show as unknown user
