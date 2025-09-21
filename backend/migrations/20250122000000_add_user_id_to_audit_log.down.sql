-- Remove user_id field from audit_log table
DROP INDEX IF EXISTS idx_audit_user_id;
ALTER TABLE audit_log DROP COLUMN IF EXISTS user_id;
