ALTER TABLE organizers
    ADD COLUMN newsletter BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE organizers SET newsletter = FALSE WHERE newsletter IS NULL;
