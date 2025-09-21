# Campus Life Events Dashboard

The dashboard is a Next.js 15 application that gives administrators a focused view of campus events, organizers, and audit data. It consumes the Campus Life Events backend API and provides workflows for scheduling, publishing, and reviewing activity.

## Architecture at a glance

- **Framework**: Next.js App Router with React 19 and TypeScript.
- **State & data**: TanStack Query for client-side caching layered on top of server actions that proxy to the backend API.
- **UI system**: shadcn/ui primitives, Tailwind CSS v4, and a small collection of custom components in `components/`.
- **Generated API client**: `client/` is created from the backend OpenAPI spec via `@hey-api/openapi-ts` so fetchers stay in sync with the Rust models.
- **Authentication helpers**: `lib/server-auth.ts` reads the `BACKEND_URL` environment variable to exchange credentials with the backend.

## Directory tour

```
frontend/
├── app/                 # Route groups, layouts, and page logic
│   └── (app)/           # Authenticated dashboard routes
├── components/          # Reusable UI widgets and layout primitives
├── hooks/               # React hooks for shared UI behaviour
├── lib/                 # Utility helpers (auth, formatting, constants)
├── client/              # Generated OpenAPI TypeScript client
├── public/              # Static assets
└── types/               # Shared TypeScript definitions
```

## Environment configuration

Create a `.env.local` file in this directory when running the dashboard outside of Docker:

```bash
BACKEND_URL=http://localhost:8080
# Optional: expose commit metadata in the UI when deploying
NEXT_PUBLIC_COMMIT_HASH=local-dev
```

`BACKEND_URL` should point to a reachable instance of the Axum API. When using Docker Compose from the repository root, this variable is injected automatically by the compose file.

## Local development

1. Install Bun (recommended) or Node.js 20 LTS.
2. Install dependencies:

   ```bash
   bun install
   ```

3. Start the development server:

   ```bash
   bun run dev
   ```

   The dashboard is available at [http://localhost:3000](http://localhost:3000). Ensure the backend API is running on the URL specified in `BACKEND_URL`.

## Working with the generated client

Regenerate the strongly typed API bindings whenever the backend's OpenAPI schema changes:

```bash
bun run openapi-ts
```

The command pulls `api-docs/openapi.json` from the running backend (configure the source in `openapi-ts.config.ts`) and rewrites the TypeScript client inside `client/`.

## Quality checks

| Task | Command |
| --- | --- |
| Lint source with Biome | `bun run lint` |
| Format files | `bun run fmt` |
| Production build smoke test | `bun run build` |

All commands run locally without Docker. The `Dockerfile` in this folder builds a standalone production image that expects the same `BACKEND_URL` environment variable at runtime.
