-- Increase token column size to accommodate longer, more secure tokens
ALTER TABLE password_reset_tokens ALTER COLUMN token TYPE VARCHAR(512);
