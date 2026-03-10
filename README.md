# CaseMind

CaseMind is a CJIS-oriented, multi-tenant case management platform for prosecutor offices. This repository now contains the local Phase 1 infrastructure baseline needed to start platform work without requiring paid cloud infrastructure.

## What exists now

- A pnpm TypeScript workspace with shared platform configuration contracts.
- A Docker Compose development stack for PostgreSQL, MongoDB, Redis, and S3-compatible object storage via MinIO.
- Shared Testcontainers helpers in `packages/test-utils` for disposable PostgreSQL, MongoDB, and Redis integration tests.
- Vitest, fast-check, Stryker, and GitHub Actions scaffolding for local-first validation.
- Infrastructure documentation that defines local environment boundaries and synthetic-data-only expectations.

## Quick start

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env`.
3. Start local infrastructure with `pnpm infra:up`.
4. Apply the local database schema and indexes with `pnpm db:reset:local`.
5. Confirm service status with `pnpm infra:status`.
6. Run validation with `pnpm validate`.

## Local database workflows

- `pnpm db:migrate:local` applies the checked-in PostgreSQL migration set.
- `pnpm db:indexes:local` reapplies required MongoDB indexes.
- `pnpm db:seed:local` loads deterministic synthetic tenant, user, case, person, and supporting records.
- `pnpm db:reset:local` resets PostgreSQL, rebuilds MongoDB indexes, and reseeds both stores.

## Phase 1 scope

Phase 1 local implementation is focused on developer infrastructure and test scaffolding. Cloud-only work such as GovCloud deployment stacks, managed AWS services, and Atlas private connectivity remains deferred until a non-local environment is introduced.

Additional details live in `docs/infrastructure/local-development.md` and `docs/infrastructure/environment-boundaries.md`.
