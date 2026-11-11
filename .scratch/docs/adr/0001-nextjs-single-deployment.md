# One Next.js app on Vercel with Neon PostgreSQL

Status: accepted (2026-11-11). Supersedes the Vite + Fastify + Railway stack named in BRD v1.0.

FinTrack BD is a small, mobile-first PWA for a handful of users, so the frontend and the API run as one Next.js 14 App Router deployment on Vercel, with Neon serverless PostgreSQL through Prisma. One codebase, one deploy and free-tier hosting matter more here than an independently scalable API; a separate Fastify service on Railway would add a second deploy, CORS and a second set of secrets for no benefit at this scale. The client is an installable PWA only; native apps are not planned.

## Consequences

- The API is Route Handlers under `app/api/v1/`. There is no long-lived server process, so nothing may rely on in-memory state between requests or on a background scheduler (see ADR-0009).
- Integration tests call route handlers directly; there is no server `inject()` helper.
- Local development and CI run against any PostgreSQL 16. The Neon driver adapter is selected only when the database host is Neon.
