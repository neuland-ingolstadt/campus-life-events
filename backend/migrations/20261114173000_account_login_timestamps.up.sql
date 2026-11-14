ALTER TABLE accounts
    ADD COLUMN last_login_at TIMESTAMPTZ,
    ADD COLUMN previous_login_at TIMESTAMPTZ;
