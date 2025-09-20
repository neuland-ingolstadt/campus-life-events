-- Remove the new fields from events table
ALTER TABLE events DROP COLUMN publish_in_ical;
ALTER TABLE events DROP COLUMN location;

-- Remove location field from organizers table
ALTER TABLE organizers DROP COLUMN location;

-- Add back the note field to audit_log table
ALTER TABLE audit_log ADD COLUMN note TEXT;