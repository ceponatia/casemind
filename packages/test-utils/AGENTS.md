# @casemind/test-utils

Shared Testcontainers helpers for disposable database and cache instances used in integration tests across the monorepo.

## Public API

Barrel export: `src/index.ts`

- `startMongoTestInstance()` — disposable MongoDB container
- `startPostgresTestInstance()` — disposable PostgreSQL container
- `startRedisTestInstance()` — disposable Redis container
- `buildMongoConnectionString()`, `buildPostgresConnectionString()`, `buildRedisConnectionString()` — connection string helpers

## Dependencies

- **Production:** `testcontainers`
- **Dev:** vitest
- **Consumed by:** `@casemind/db` (dev), `@casemind/auth` (dev)

This is a **leaf package** — it has no inter-package dependencies.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm test` | Run unit tests (no Docker required) |
| `pnpm test:integration` | Run container integration tests (requires Docker) |
| `pnpm lint` | Lint src and tests |
| `pnpm typecheck` | Type-check with `tsc` |

All commands work from within this package directory. Prerequisite: `pnpm install` from the monorepo root. Integration tests require a running Docker daemon.

## Conventions

- Export all helpers through `src/index.ts`. No subpath exports.
- Do not add inter-package dependencies — this is intentionally a leaf.
- Each container helper returns a disposable instance with a `stop()` method. Tests must clean up in `afterEach` or `afterAll`.
- Container helpers are test infrastructure, not application code. Keep them minimal.