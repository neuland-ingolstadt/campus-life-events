UPDATE events
SET end_date_time = start_date_time
WHERE end_date_time IS NULL;

ALTER TABLE events
    ALTER COLUMN end_date_time SET NOT NULL;
