-- Add publish_web field to events table
ALTER TABLE events ADD COLUMN publish_web BOOLEAN NOT NULL DEFAULT TRUE;
