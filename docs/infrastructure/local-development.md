# Local Development Infrastructure

Phase 1 establishes a local-first runtime that mirrors the application-facing contracts the cloud environment will later use.

## Services

- PostgreSQL 16 on `localhost:5432`
- MongoDB 7 on `localhost:27017`
- Redis 7 on `localhost:6380`
- MinIO S3-compatible object storage on `localhost:9000`
- MinIO console on `localhost:9001`

## Commands

```bash
pnpm infra:up
pnpm infra:status
pnpm infra:down
pnpm infra:reset
pnpm infra:logs
```

## Environment contract

Copy `.env.example` to `.env` and keep the variable names stable across local, CI, and future cloud deployment targets.

Redis uses host port `6380` by default so the stack is less likely to collide with an existing local Redis instance. If you need a different host port, override `CASEMIND_REDIS_HOST_PORT` and keep `CASEMIND_REDIS_URL` in sync.

## Buckets

The `minio-init` sidecar creates two buckets during startup:

- `casemind-documents-dev`
- `casemind-evidence-dev`

These map to the document and evidence storage contracts described in Phase 1.

## Test strategy

- Unit and contract tests run with Vitest.
- Integration tests start disposable PostgreSQL, MongoDB, and Redis containers via Testcontainers.
- Atlas-only smoke tests remain deferred until a non-production Atlas environment exists.
