# Campus Life Events API

This service exposes the REST and OpenAPI interface that powers the Campus Life Events dashboard. It is built with Axum, SQLx, and PostgreSQL and ships with automatic migrations and optional email notifications for administrator workflows.

## Core architecture

- **Web framework**: [Axum](https://github.com/tokio-rs/axum) with layered middleware for CORS and security headers.
- **Database layer**: [SQLx](https://github.com/launchbadge/sqlx) with asynchronous PostgreSQL access and migrations stored in `migrations/`.
- **Domain modules**: Route handlers grouped under `src/routes/` for health checks, authentication, events, organizers, audit logs, iCal feeds, and admin utilities.
- **OpenAPI spec**: `src/openapi.rs` uses `utoipa` to derive documentation that is served at `/swagger-ui`.
- **Email notifications**: `src/email.rs` wires SMTP configuration (via Lettre) for invitations and password flows; falls back to logging links when SMTP is absent.

## Local development

### Prerequisites

- Rust 1.80+ with `cargo` (the crate targets the 2024 edition)
- PostgreSQL 16 locally or via Docker
- (Optional) `sqlx-cli` for managing migrations from the command line

A compose file is provided to run PostgreSQL only:

```bash
cd backend
docker compose up -d
```

It exposes the database on `postgres://cle:cle_password@localhost:5422/cle_db`.

### Environment variables

Create an `.env.local` file to mirror the values expected by `dotenvy` when the server boots:

```bash
DATABASE_URL=postgres://cle:cle_password@localhost:5422/cle_db
ALLOWED_ORIGINS=http://localhost:3000
# Optional SMTP configuration
SMTP_HOST=smtp.example.com
SMTP_USERNAME=apikey
SMTP_PASSWORD=secret
SMTP_FROM_EMAIL=events@example.com
SMTP_FROM_NAME=Campus Life Events
REGISTRATION_BASE_URL=http://localhost:3000/register
RESET_BASE_URL=http://localhost:3000/reset-password
```

Any missing SMTP variables will disable email sending and log invite/reset URLs to the console.

### Running the API

```bash
# from the backend/ directory
cargo run
```

On startup the server applies migrations from `migrations/`, binds to `0.0.0.0:8080`, and exposes documentation at `http://localhost:8080/swagger-ui`.

### Applying migrations manually

If you prefer to run migrations yourself (for example when using `sqlx-cli`):

```bash
sqlx migrate run
```

Add new migrations with `sqlx migrate add <name>` and commit the resulting files under `migrations/`.

### Tests and formatting

```bash
cargo fmt
cargo clippy --all-targets --all-features
cargo test
```

Running tests requires the database specified in `DATABASE_URL` to be reachable. Use the provided compose service or a local PostgreSQL instance.

## Operational notes

- CORS origins are controlled via the `ALLOWED_ORIGINS` variable (comma-separated list). Defaults cover local dashboard development.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, and HSTS) are injected globally through `tower-http` middleware.
- iCal feeds are available under `/api/v1/ical/...` and are used by the frontend to export event calendars.

Refer to `src/routes/` for the full list of endpoints and payloads; each module documents its handlers inline and is represented in the generated OpenAPI schema.
