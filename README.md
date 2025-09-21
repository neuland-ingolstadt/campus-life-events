# Campus Life Events

Campus Life Events is a monorepo that bundles the backend API and the admin dashboard used to plan, publish, and review campus programming. The stack is designed so the two services can run together through Docker Compose or independently for local development.

## Repository layout

| Path | Description |
| --- | --- |
| `backend/` | Axum + SQLx REST API that stores events, organizers, audit logs, authentication data, and iCal feeds. Includes docker-compose.yml for local PostgreSQL. |
| `frontend/` | Next.js 15 dashboard for managing content and interacting with the API. |
| `nginx/` | Reverse-proxy assets used for the production container image. |

Each service folder contains a dedicated README with deep-dive instructions, architecture notes, and developer workflows.

## Quick start with local development

1. Clone the repository and start the database:

   ```bash
   git clone <repo-url>
   cd campus-life-events/backend
   docker compose up -d
   ```

   This launches PostgreSQL 16 with the `cle_db` database.

2. Start the backend API:

   ```bash
   cd backend
   cargo run
   ```

3. Start the frontend dashboard:

   ```bash
   cd frontend
   bun install
   bun run dev
   ```

4. Visit [http://localhost:3000](http://localhost:3000) for the dashboard and [http://localhost:8080/swagger-ui](http://localhost:8080/swagger-ui) for interactive API docs.
5. When finished, stop the database with `cd backend && docker compose down`. Add `-v` to also remove the PostgreSQL volume (`pgdatae`).

## Developing services individually

You can work on each service without Docker if you prefer native tooling:

- [Frontend deep dive](frontend/README.md) explains the Next.js architecture, environment variables, and development scripts.
- [Backend deep dive](backend/README.md) covers the Axum API, database schema management, and optional email infrastructure.

For any workflow, make sure the backend API is reachable by the frontend dashboard at `http://localhost:8080` or adjust the documented environment variables accordingly.
