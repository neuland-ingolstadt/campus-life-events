ALTER TABLE organizers
    ADD COLUMN linkedin_url TEXT,
    ADD COLUMN registration_number TEXT,
    ADD COLUMN non_profit BOOLEAN NOT NULL DEFAULT FALSE;
