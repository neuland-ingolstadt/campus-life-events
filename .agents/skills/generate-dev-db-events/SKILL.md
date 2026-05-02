---
name: generate-dev-db-events
description: >-
  Seeds or refreshes Campus Life Events PostgreSQL demo data via Docker Compose
  Postgres. Generates bilingual (DE/EN) events with realistic timestamps, about
  three to four events per calendar week, using existing organizers. Use when
  the user asks for dev/demo events, seed data, filling the local database,
  refreshing outdated demo events, or bulk INSERTs for events in backend/docker-compose.
---

# Generate dev database events

## Preconditions

- Postgres container from `backend/docker-compose.yml` is running (`cle-postgres`).
- Inserts target the **`events`** table; **`organizer_id`** must reference an existing `organizers.id`.

## Connection (local Compose)

From `backend/docker-compose.yml`:

| Setting | Value |
|--------|--------|
| Host (from machine) | `localhost` |
| Port | **5422** |
| User | `cle` |
| Password | `cle_password` |
| Database | `cle_db` |
| Container name | `cle-postgres` |

Shell:

```bash
docker exec -i cle-postgres psql -U cle -d cle_db -v ON_ERROR_STOP=1
```

**Important:** use `docker exec **-i**` when piping SQL or a heredoc into `psql`. Without `-i`, stdin is ignored and nothing runs.

Host `psql` (if installed):

```bash
psql "postgres://cle:cle_password@localhost:5422/cle_db"
```

## `events` row shape

Required / typical columns:

- `organizer_id` (BIGINT, FK to `organizers`)
- `title_de`, `title_en` (NOT NULL)
- `description_de`, `description_en` (optional)
- `start_date_time`, `end_date_time` (**both NOT NULL**; `end_date_time` must be after start)
- `event_url`, `location` (optional)
- `publish_app`, `publish_newsletter`, `publish_in_ical`, `publish_web` (BOOLEAN; default demo pattern: all `TRUE`)

Use `TIMESTAMPTZ` strings with explicit offset, e.g. `2026-05-14T17:00:00+02` for Europe/Berlin summer time.

## Cadence

- Aim for **3–4 events per week** over the requested date range (e.g. one semester window).
- Spread weekdays (e.g. Tue, Wed, Thu, Sat) to avoid unrealistic stacking unless the user asks otherwise.
- Rotate **`organizer_id`** across existing organizers (query `SELECT id, name FROM organizers ORDER BY id` first).

## Workflow

1. List organizers: `SELECT id, name FROM organizers ORDER BY id;`
2. Optionally clear old demo rows in the target window: `DELETE FROM events WHERE ...` (check `audit_log` for `event_id` if constraints exist).
3. Generate `INSERT INTO events (...) VALUES (...), (...);` in batches.
4. Apply with `docker exec -i cle-postgres psql -U cle -d cle_db -v ON_ERROR_STOP=1 <<'SQL' ... SQL`
5. Verify density:

```sql
SELECT date_trunc('week', start_date_time)::date AS week_start, COUNT(*) AS n
FROM events
WHERE start_date_time >= 'YYYY-MM-DD' AND start_date_time < 'YYYY-MM-DD'
GROUP BY 1 ORDER BY 1;
```

## Generation pattern (recommended)

Use a short script (e.g. Python) to emit SQL: cycle organizer ids and event templates, fix `end` after `start`, escape single quotes in text as `''`, and print one multi-row `INSERT`.

## Content guidelines

- Bilingual **German / English** titles and descriptions matching campus-life tone.
- Varied categories: sports, culture, tech workshops, sustainability, music, debate, international office, etc.
- Prefer **plausible** locations and optional `https://example.edu/...` URLs for demos.

## Optional cleanup

If the user wants only the new cohort in a window, delete superseded rows by id or by `start_date_time` range after confirming no important FKs (e.g. `audit_log.event_id`).
