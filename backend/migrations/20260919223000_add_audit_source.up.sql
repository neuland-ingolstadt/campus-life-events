CREATE TYPE audit_source AS ENUM ('UI', 'MCP', 'API');

ALTER TABLE audit_log
  ADD COLUMN source audit_source NOT NULL DEFAULT 'UI';
