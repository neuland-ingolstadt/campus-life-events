# Campus Life Events

Campus Life Events is a monorepo that bundles the backend API and the admin dashboard used to plan, publish, and review campus programming. The stack is designed so the two services can run together through Docker Compose or independently for local development.

## Repository layout

| Path | Description |
| --- | --- |
| `backend/` | Axum + SQLx REST API that stores events, organizers, audit logs, authentication data, and iCal feeds. |
| `frontend/` | Next.js 15 dashboard for managing content and interacting with the API. |
| `docker-compose.yml` | Launches PostgreSQL, the backend, and the frontend with sensible defaults for evaluation. |
| `nginx/` | Reverse-proxy assets used for the production container image. |

Each service folder contains a dedicated README with deep-dive instructions, architecture notes, and developer workflows.

## Quick start with Docker Compose

1. Ensure Docker Engine 24+ and Docker Compose v2 are installed.
2. Clone the repository and start the stack:

   ```bash
   git clone <repo-url>
   cd campus-life-events
   docker compose up --build
   ```

   The compose file launches three containers:
   - `db` (PostgreSQL 16) seeded with the `cle_db` database
   - `backend` (Rust/Axum API) with automatic SQLx migrations
   - `frontend` (Next.js dashboard) proxying API calls to the backend

3. Visit [http://localhost:3000](http://localhost:3000) for the dashboard and [http://localhost:8080/swagger-ui](http://localhost:8080/swagger-ui) for interactive API docs.
4. When finished, stop the services with `docker compose down`. Add `-v` to also remove the PostgreSQL volume (`cle-pgdata`).

## Developing services individually

You can work on each service without Docker if you prefer native tooling:

- [Frontend deep dive](frontend/README.md) explains the Next.js architecture, environment variables, and development scripts.
- [Backend deep dive](backend/README.md) covers the Axum API, database schema management, and optional email infrastructure.

For any workflow (Compose or native), make sure the backend API is reachable by the frontend dashboard at `http://localhost:8080` or adjust the documented environment variables accordingly.
