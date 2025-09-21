-- Revert token column size back to original
ALTER TABLE password_reset_tokens ALTER COLUMN token TYPE VARCHAR(255);
