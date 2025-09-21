# Campus Life Events

Campus Life Events is a comprehensive monorepo containing both the backend API and admin dashboard for planning, publishing, and reviewing campus events. The architecture is designed to allow both services to run together via Docker or independently for local development.

## Who is this for?

This platform enables clubs and organizations at THI (Technische Hochschule Ingolstadt) to manage their campus events efficiently.
Each club has its own dedicated account to create and manage events, while administrators can review, moderate, and approve submissions. Administrators also have the ability to invite new clubs to join the platform.

To maximize event visibility and engagement, clubs can share their events as iCal feeds and publish them directly on the website. The built-in email export feature enables the generation of weekly newsletters that are distributed to all students. Additionally, all events are seamlessly integrated into the [Neuland Next App](https://neuland.app), providing students with easy access to campus activities.

## Repository Structure

| Path | Description |
| --- | --- |
| `backend/` | Axum + SQLx REST API that manages events, organizers, audit logs, authentication, and iCal feeds. Includes docker-compose.yml for local PostgreSQL setup. |
| `frontend/` | Next.js 15 dashboard for content management and API interaction. |

Each service directory contains a dedicated README with detailed instructions, architecture documentation, and development workflows.

## Quick Start for Local Development

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

4. Access the application:
   - Dashboard: [http://localhost:3000](http://localhost:3000)
   - API Documentation: [http://localhost:8080/swagger-ui](http://localhost:8080/swagger-ui)

5. When finished, stop the database with `cd backend && docker compose down`. Add `-v` to also remove the PostgreSQL volume (`pgdatae`).

## Individual Service Development

You can develop each service independently without Docker if you prefer native tooling:

- [Frontend Documentation](frontend/README.md) covers the Next.js architecture, environment configuration, and development scripts.
- [Backend Documentation](backend/README.md) details the Axum API, database schema management, and optional email infrastructure.

For any development workflow, ensure the backend API is accessible to the frontend dashboard at `http://localhost:8080` or adjust the environment variables accordingly.
