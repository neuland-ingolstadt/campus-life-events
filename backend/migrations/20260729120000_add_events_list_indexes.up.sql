CREATE INDEX events_start_date_time_idx ON events (start_date_time);
CREATE INDEX events_organizer_start_date_time_idx ON events (organizer_id, start_date_time);
