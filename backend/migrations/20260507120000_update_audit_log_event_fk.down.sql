ALTER TABLE audit_log ADD CONSTRAINT audit_log_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
