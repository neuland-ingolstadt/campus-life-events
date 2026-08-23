# Campus Life Events Dashboard

The dashboard is a Next.js application that gives administrators a focused view of campus events, organizers, and audit data. It consumes the Campus Life Events backend API and provides workflows for scheduling, publishing, and reviewing activity.

## Architecture at a glance

- **Framework**: Next.js App Router with React and TypeScript.
- **State & data**: TanStack Query for client-side caching layered on top of server actions that proxy to the backend API.
- **UI system**: shadcn/ui primitives, Tailwind CSS and a small collection of custom components in `components/`.
- **Generated API client**: `client/` is created from the backend OpenAPI spec via `@hey-api/openapi-ts` so fetchers stay in sync with the Rust models.
- **Authentication helpers**: `lib/server-auth.ts` reads the `BACKEND_URL` environment variable to exchange credentials with the backend.

## Local development

1. Install Bun
2. Install dependencies
3. Start the development server

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
