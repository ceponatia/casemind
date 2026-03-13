# @casemind/rbac

Authorization policy engine for CaseMind. Defines canonical platform roles, the permission matrix, tenant isolation rules, sensitive-case restrictions, field-protection decisions, and break-glass handling.

## Public API

Barrel export: `src/index.ts`

- **Types:** `RoleId`, `Action`, `ResourceType`, `SensitivityTag`, `FieldId`, `PermissionCheckInput`, `PermissionDecision`, `FieldAccessCheckInput`, `FieldPermissionDecision`, `AuthorizationAuditEvent`
- **Roles:** `ROLE_IDS`, `ROLE_DEFINITIONS`, `ROLE_DEFINITIONS_BY_ID`, `BREAK_GLASS_ROLE_IDS`
- **Policies:** `PERMISSION_MATRIX`, `getAllowedActionsForRole()`
- **Enforcement:** `evaluatePermission()`, `evaluateFieldAccess()`, `authorizeOrThrow()`, `withAuthorization()`, `AuthorizationError`
- **Break-glass:** `MIN_BREAK_GLASS_JUSTIFICATION_LENGTH`, `validateBreakGlassJustification()`, `authorizeBreakGlassAccess()`, `withBreakGlassAuthorization()`

## Dependencies

- **Production:** none
- **Dev:** `fast-check`, `vitest`
- **Consumed by:** `@casemind/auth`, `@casemind/db`, future app layer

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm test` | Run unit + contract tests |
| `pnpm test:integration` | Run package-level integration tests |
| `pnpm test:mutate` | Run Stryker mutation testing |
| `pnpm lint` | Lint src and tests |
| `pnpm typecheck` | Type-check with `tsc` |

All commands work from within this package directory. Prerequisite: `pnpm install` from the monorepo root.

## Conventions

- Export all public types, constants, and helpers through `src/index.ts`. No subpath exports.
- Keep the permission matrix explicit and fail closed. Missing role/resource/action combinations should deny, not infer.
- Cross-tenant access is always denied in policy evaluation. Break-glass must never bypass tenant boundaries.
- Break-glass justifications are compliance-relevant audit inputs. Do not weaken validation without explicit review.