# AGENTS.md

This file provides essential information for AI coding agents working on the Campus Life Events project.

## Project Overview

Campus Life Events is a full-stack monorepo for managing campus events. It consists of:

- **Backend**: Rust/Axum REST API with PostgreSQL database
- **Frontend**: Next.js 15 dashboard with React 19 and TypeScript
- **Infrastructure**: Docker Compose setup for database, start services manually

The system handles event management, organizer administration, audit logging, authentication, and iCal feed generation.

## Repository Structure

```
campus-life-events/
├── backend/           # Rust/Axum API server (includes docker-compose.yml for local DB)
├── frontend/          # Next.js dashboard
└── README.md          # Project overview
```

## Quick Start Commands

### Backend Development
```bash
cd backend
# Start PostgreSQL only
docker compose up -d

# Run the API server
cargo run

# Run tests
cargo test

# Format code (MANDATORY - zero warnings tolerated)
cargo fmt

# Lint code (MANDATORY - zero warnings tolerated)
cargo clippy --all-targets --all-features -- -D warnings
```

### Frontend Development
```bash
cd frontend
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Lint code (MANDATORY - zero warnings tolerated)
bun run lint

# Format code (MANDATORY - zero warnings tolerated)
bun run fmt

# Regenerate API client
bun run openapi-ts
```

## Environment Configuration

### Backend (.env.example in backend/)
```bash
DATABASE_URL=postgres://cle:cle_password@localhost:5422/cle_db
ALLOWED_ORIGINS=http://localhost:3000
# Optional SMTP configuration
SMTP_HOST=smtp.example.com
SMTP_USERNAME=apikey
SMTP_PASSWORD=secret
SMTP_FROM_EMAIL=events@example.com
SMTP_FROM_NAME=Campus Life Events
BASE_URL=http://localhost:3000
```

### Frontend (.env.local in frontend/)
```bash
BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_COMMIT_HASH=local-dev
```

## Technology Stack

### Backend
- **Framework**: Axum 0.8.4
- **Database**: PostgreSQL 16 with SQLx
- **Authentication**: Argon2 password hashing
- **API Documentation**: OpenAPI/Swagger with utoipa
- **Email**: Lettre with SMTP support
- **Migrations**: SQLx migrations in `migrations/`

### Frontend
- **Framework**: Next.js 15 with App Router
- **React**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: TanStack Query
- **Forms**: React Hook Form with Zod validation
- **Code Quality**: Biome for linting and formatting

## Code Style Guidelines

### Rust (Backend)
- Use `cargo fmt` for formatting (MANDATORY - zero warnings tolerated)
- Follow Rust naming conventions (snake_case for variables, PascalCase for types)
- Use `cargo clippy --all-targets --all-features -- -D warnings` for linting (MANDATORY - zero warnings tolerated)
- Prefer `?` operator over explicit error handling where appropriate
- Use `sqlx::query_as!` for type-safe database queries

### TypeScript/React (Frontend)
- Use Biome for formatting and linting (MANDATORY - zero warnings tolerated)
- Follow the existing patterns in `components/` and `app/`
- Use single quotes for strings
- Prefer tabs for indentation
- Use React Hook Form for form handling
- Generate API client with `bun run openapi-ts` when backend changes

## General Guidelines
- Do not write comments in the code

## Database Management

### Migrations
- Located in `backend/migrations/`
- Use `sqlx migrate add <name>` to create new migrations
- Migrations run automatically on server startup
- Manual execution: `sqlx migrate run`

### Schema
- Events, organizers, audit logs, and user authentication tables
- See `backend/migrations/20250921100000_initial_schema.up.sql` for schema

## API Development

### Backend Routes
- Health: `/api/v1/health`
- Auth: `/api/v1/auth/*`
- Events: `/api/v1/events/*`
- Organizers: `/api/v1/organizers/*`
- Admin: `/api/v1/admin/*`
- iCal: `/api/ical/*`
- OpenAPI docs: `/swagger-ui`

### Frontend API Client
- Generated from backend OpenAPI spec
- Located in `frontend/client/`
- Regenerate with `bun run openapi-ts`
- Configure source in `openapi-ts.config.ts`

## Testing Strategy

### Backend Testing
```bash
# Run all tests (requires database)
cargo test

# Run specific test
cargo test test_name
```

### Frontend Testing
- Use `bun run build` for build verification
- Manual testing through browser at http://localhost:3000
- API integration testing through the dashboard

## Security Considerations

- **CORS**: Controlled via `ALLOWED_ORIGINS` environment variable
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, HSTS
- **Password Hashing**: Argon2 with secure defaults
- **Authentication**: Session-based with secure cookies
- **Input Validation**: Zod schemas for frontend, serde for backend

## Deployment

### Docker Images
- Backend: `ghcr.io/neuland-ingolstadt/campus-life-events-backend:latest`
- Frontend: `ghcr.io/neuland-ingolstadt/campus-life-events-frontend:latest`

### Production Setup
- Deploy services independently (no top-level compose file)
- ingress handles reverse proxy and static assets
- PostgreSQL data persisted in `pgdatae` volume (backend compose)

## Common Development Tasks

### Adding New API Endpoints
1. Add route handler in `backend/src/routes/`
2. Update OpenAPI documentation in `backend/src/openapi.rs`
3. Regenerate frontend client: `bun run openapi-ts`
4. Add frontend components to consume the endpoint

### Database Schema Changes
1. Create migration: `sqlx migrate add description`
2. Write up/down SQL in `backend/migrations/`
3. Test migration: `sqlx migrate run`
4. Update models in `backend/src/models.rs` if needed

### Frontend Component Development
1. Create component in `components/` or appropriate subdirectory
2. Use existing UI primitives from `components/ui/`
3. Follow patterns in similar components
4. Add TypeScript types as needed

## Troubleshooting

### Backend Issues
- Check database connection: `DATABASE_URL` must be correct
- Verify migrations: check `backend/migrations/` directory
- Check logs: server logs will show startup errors
- View API: visit `http://localhost:8080/api-docs/openapi.json`

### Frontend Issues
- Verify backend connection: check `BACKEND_URL` environment variable
- Regenerate API client: `bun run openapi-ts` (Backend must be running)
- Check build: `bun run build` for compilation errors
- Clear cache: delete `.next` directory and restart

### Docker Issues
- Rebuild database: `cd backend && docker compose up --build`
- Check logs: `cd backend && docker compose logs`
- Reset database: `cd backend && docker compose down -v` (WARNING: deletes data)

## Important Notes

- The frontend proxies API calls to the backend in development
- In production, ingress handles the API routing
- Email functionality is optional and falls back to console logging
- The system uses PostgreSQL 16 with specific connection parameters
- All services must be running for full functionality
- The project uses modern Rust (2024 edition) and Next.js 15 features

## Getting Help

- Check individual service READMEs in `backend/README.md` and `frontend/README.md`
- Review OpenAPI documentation at `http://localhost:8080/api-docs/openapi.json`
- Examine existing code patterns in `src/routes/` and `components/`

## Cursor Cloud specific instructions

The update script keeps dependencies fresh (`bun install` for the frontend, `cargo fetch` for the backend). It does NOT start services or create env files. Start services manually each session, in this order:

1. Docker is installed but not managed by systemd. Start the daemon once per session: `sudo dockerd` (run it in a background terminal/tmux; it uses the `fuse-overlayfs` storage driver). Then start the database: `cd backend && docker compose up -d` (Postgres on host port `5422`, Redis on `6379`).
2. Backend: `cd backend && SQLX_OFFLINE=true cargo run`. The `SQLX_OFFLINE=true` is REQUIRED on a fresh database. The `sqlx::query!` macros validate SQL at compile time; migrations only run at app startup, so a freshly-created DB has no schema yet and an online build (`cargo run` without the flag) fails with confusing `str` size errors. Offline mode uses the committed `.sqlx/` cache instead. Same applies to `cargo build`/`cargo clippy`/`cargo test` (CI sets `SQLX_OFFLINE=true`). After the backend has run once and migrations are applied, plain `cargo run` also works.
3. Frontend: `cd frontend && bun run dev` (port 3000, proxies `/api/*` to the backend).

Env files are local and untracked; create them if missing: `backend/.env` (`DATABASE_URL=postgres://cle:cle_password@localhost:5422/cle_db`, `REDIS_URL=redis://localhost:6379`, `ALLOWED_ORIGINS=http://localhost:3000`, `API_TOKEN_SECRET=<any-long-string>`) and `frontend/.env.local` (`BACKEND_URL=http://localhost:8080`, `NEXT_PUBLIC_COMMIT_HASH=local-dev`).

Other gotchas:
- Backend health endpoint is `/api/v1/healthcheck` (not `/health`).
- No admin account exists by default and registration requires a setup token (admins normally issue these). To bootstrap a first account for testing, insert one directly via psql and complete setup in the browser: insert an `organizers` row plus an `accounts` row with `setup_token=<token>` and `setup_token_expires_at=NOW() + INTERVAL '7 days'`, then open `http://localhost:3000/register?token=<token>` to set a password and log in. Passwords must be ≥20 chars with upper/lower/digit/symbol (see `frontend/lib/password-policy.ts`).
- The dashboard UI is in German.
- Rust must be on a toolchain that supports edition 2024 (≥1.85); `rustup default stable` is used here.
