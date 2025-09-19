# Campus Life Events Monorepo

Campus Life Events is a full-stack application for managing campus-wide events. This repository contains the Axum-based backend API and the Next.js dashboard frontend that consumes it.

## Repository Structure

- `backend/` – Rust (Axum + SQLx) API service with database migrations
- `frontend/` – Next.js 15 dashboard for managing events and organizers
- `docker-compose.yml` – Orchestrates the database, backend, and frontend for local development or evaluation

## Prerequisites

To run the full stack locally you need:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) **or** Docker Engine 24+
- Docker Compose v2 (ships with Docker Desktop and modern Docker Engine installs)

> ⚠️ The compose stack builds images for both the backend (Rust) and frontend (Node.js). The initial build can take several minutes the first time it runs.

## Quick Start

1. Clone the repository and change into it:

   ```bash
   git clone <repo-url>
   cd campus-life-events
   ```

2. Start all services with Docker Compose:

   ```bash
   docker compose up --build
   ```

   Compose spins up three containers:

   | Service   | Port | Description |
   |-----------|------|-------------|
   | `db`      | 5432 | PostgreSQL 16 instance seeded with the `cle` database |
   | `backend` | 8080 | Axum API service that automatically runs SQLx migrations on start |
   | `frontend`| 3000 | Next.js dashboard proxying API calls to the backend |

3. Open the dashboard at [http://localhost:3000](http://localhost:3000) and the API (including Swagger UI) at [http://localhost:8080/swagger-ui](http://localhost:8080/swagger-ui).

4. Stop the stack when you are done:

   ```bash
   docker compose down
   ```

   To persist PostgreSQL data between runs, Compose mounts the database files in the named volume `cle-pgdata`.

## Environment Configuration

The compose file provides sensible defaults for development:

- `DATABASE_URL=postgres://cle:cle_password@db:5432/cle_db` is injected into the backend container.
- `BACKEND_URL=http://backend:8080` is injected into the frontend container so that Next.js rewrites `/api/*` requests to the API container.

If you want to point the frontend to a different backend or adjust database credentials, edit `docker-compose.yml` and re-run `docker compose up --build`.

For manual (non-Docker) development, refer to the individual service READMEs for instructions on installing dependencies and running each service directly.

## Useful Commands

- View logs for all services:
  ```bash
  docker compose logs -f
  ```
- Rebuild a single service after code changes (e.g., backend):
  ```bash
  docker compose build backend
  docker compose up backend
  ```
- Remove containers and volumes (destroys database data):
  ```bash
  docker compose down -v
  ```

## Troubleshooting

- **Ports already in use:** Ensure ports 3000, 8080, and 5432 are free or update the published ports in `docker-compose.yml`.
- **Slow initial startup:** The backend service compiles the Rust project and runs SQLx migrations the first time. Subsequent startups are much faster thanks to Docker layer caching.
- **Database connection errors:** Confirm the database container is healthy (`docker compose ps`) and that the `DATABASE_URL` value in `docker-compose.yml` matches the credentials defined for the `db` service.

Enjoy building with Campus Life Events!
