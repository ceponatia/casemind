# @casemind/platform-config

Zero-dependency configuration contracts and local environment helpers for the CaseMind platform.

## Public API

Barrel export: `src/index.ts`

- **Types:** `DeploymentStage`, `TenantKeyStrategy`, `AtlasConnectivityConfig`, `PlatformDataConfig`, `PlatformStackConfig`, `LocalObjectStorageConfig`, `LocalPostgresApplicationRoleConfig`, `LocalPlatformServiceContract`
- **Helpers:** `getLocalPlatformConfig()`, `getLocalPlatformServiceContract()`

## Dependencies

- **Production:** none
- **Dev:** vitest
- **Consumed by:** `@casemind/db` (production import of `getLocalPlatformServiceContract` in scripts)

This is a **leaf package** — it has no inter-package dependencies.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm test` | Run unit tests |
| `pnpm lint` | Lint src and tests |
| `pnpm typecheck` | Type-check with `tsc` |

All commands work from within this package directory. Prerequisite: `pnpm install` from the monorepo root.

## Conventions

- Export all public types and helpers through `src/index.ts`. No subpath exports.
- Do not add inter-package dependencies without coordination — this is intentionally a leaf.
- Configuration types define the contract between infrastructure and application code. Changes here ripple to every consumer.