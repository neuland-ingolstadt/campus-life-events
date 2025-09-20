-- Add location field to organizers table
ALTER TABLE organizers ADD COLUMN location TEXT;

-- Add location and publish_in_ical fields to events table
ALTER TABLE events ADD COLUMN location TEXT;
ALTER TABLE events ADD COLUMN publish_in_ical BOOLEAN NOT NULL DEFAULT TRUE;

-- Remove the note field from audit_log table (it was used for audit_note)
ALTER TABLE audit_log DROP COLUMN note;