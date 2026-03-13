# @casemind/db

Multi-store data access layer for CaseMind. Implements tenant-isolated repository contracts against PostgreSQL (relational, via Prisma) and MongoDB (document store). Includes deterministic seed data and contract-driven testing.

## Public API

Barrel export: `src/index.ts`

- **Contracts:** `RepositoryContext`, `CaseRepository`, `PersonRepository`, `CatalogRepository`, and other repository interfaces
- **Types:** `TenantScopedRecord`, `CriminalCase`, `NACase`, `Person`, `DocumentRecord`, `EvidenceRecord`, `FamilyUnit`, `ServicePlan`, `AuditLogEntry`, `NotificationRecord`, `CalendarEvent`, `AiInteractionPlaceholder`, `TenantRecord`, `UserRecord` (with `roleIds`), and `New*` input variants
- **PostgreSQL:** `PostgresRelationalRepository`, `createPostgresPool()`, `applyPostgresMigrations()`, `provisionPostgresApplicationRole()`, `buildApplicationRoleConnectionString()`
- **MongoDB:** `MongoCaseRepository`, `connectMongoDatabase()`, `applyMongoIndexes()`
- **Seeds:** `createDeterministicSeedSet()`, `createLocalDevelopmentSeedSets()`
- **Testing:** `InMemoryCaseRepository`, `runCaseRepositoryContractSuite()`

## Dependencies

- **Production:** `@casemind/platform-config` (workspace), `@casemind/rbac` (workspace), `@prisma/client`, `mongodb`, `pg`
- **Dev:** `@casemind/test-utils` (workspace), `@types/pg`, `fast-check`, `prisma`, `tsx`, vitest
- **Consumed by:** no packages yet (will be consumed by app layer)

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm test` | Run unit + contract tests (no Docker required for in-memory) |
| `pnpm test:integration` | Run PostgreSQL and MongoDB integration tests (requires Docker) |
| `pnpm test:mutate` | Stryker mutation testing |
| `pnpm lint` | Lint src and tests |
| `pnpm typecheck` | Type-check with `tsc` |
| `pnpm db:migrate:local` | Apply PostgreSQL migrations locally |
| `pnpm db:indexes:local` | Rebuild MongoDB indexes |
| `pnpm db:seed:local` | Load deterministic synthetic data |
| `pnpm db:reset:local` | Full local reset (migrate + seed + indexes) |

All commands work from within this package directory. Prerequisite: `pnpm install` from the monorepo root. Integration and database commands require local infrastructure (`pnpm infra:up` from monorepo root).

## Architecture notes

- **Contract-driven testing:** `runCaseRepositoryContractSuite()` validates any `CaseRepository` implementation (in-memory, MongoDB) against the same behavioral test suite.
- **Row-level security:** PostgreSQL enforces tenant isolation at the database level via RLS policies. The restricted application role (`casemind_app`) cannot bypass tenant boundaries.
- **Dual-store design:** Relational data (tenants, users, audit logs, calendar, notifications) lives in PostgreSQL. Document-oriented case data lives in MongoDB. Both stores use `tenantId` scoping.
- **Deterministic seeds:** `createDeterministicSeedSet()` produces reproducible synthetic data for both stores, parameterized by tenant.
- **Local authorization seeds:** `createLocalDevelopmentSeedSets()` expands the local seed path to two synthetic tenants with all canonical PH05 roles so tenant-isolation and break-glass behavior can be exercised locally.
- **Scripts use `@casemind/platform-config`** to resolve local connection strings.

## Conventions

- Export all public types, contracts, and implementations through `src/index.ts`. No subpath exports.
- All repository methods require a `RepositoryContext` with `tenantId` and `actorUserId`. Never bypass tenant scoping.
- Relational users persist `roleIds` as an explicit array. Do not collapse them back to a single `role` string.
- Prisma schema lives at `prisma/schema.prisma` with migrations in `prisma/migrations/`. Use `prisma.config.ts` for Prisma CLI configuration.
- Do not reference real CJI or production data. Seeds and tests use synthetic records only.