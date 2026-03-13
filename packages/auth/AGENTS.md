# @casemind/auth

Authentication, session management, MFA, and credential handling for the CaseMind platform. CJIS-aligned session policies and password requirements are enforced by default.

## Public API

Barrel export: `src/index.ts`

- **Types:** `AuthProviderType`, `AuthenticatedUser`, `SessionPolicy`, `PasswordPolicy`, `TotpEnrollmentState`, `SessionMetadata`, `SessionPrincipal`, `AuthSession`, `CreateLocalUserInput`, `LocalUserAccount`, `LocalAuthConfig`
- **Crypto:** `hashPassword()`, `verifyPassword()`
- **MFA:** `generateRecoveryCodes()`, `hashRecoveryCodes()`, `verifyRecoveryCode()`, TOTP enrollment and verification
- **Policy:** `DEFAULT_PASSWORD_POLICY`, `DEFAULT_SESSION_POLICY`, validation helpers
- **Providers:** `authenticateWithCredentials()`
- **Service:** `createAuthService()` — unified auth facade
- **Session stores:** `createMemorySessionStore()`, `createRedisSessionStoreFromUrl()`, `SessionStore` interface
- **Users:** `InMemoryUserDirectory`, `SYNTHETIC_USERS`

## Dependencies

- **Production:** `@casemind/rbac` (canonical role ids), `redis`
- **Dev:** `@casemind/test-utils` (workspace), `fast-check`, vitest
- **Consumed by:** no packages yet (will be consumed by app layer)

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm test` | Run unit tests |
| `pnpm test:integration` | Run Redis integration tests (requires Docker) |
| `pnpm lint` | Lint src and tests |
| `pnpm typecheck` | Type-check with `tsc` |

All commands work from within this package directory. Prerequisite: `pnpm install` from the monorepo root. Integration tests require a running Docker daemon (Redis via Testcontainers).

## Conventions

- Export all public types, functions, and constants through `src/index.ts`. No subpath exports.
- Session policies and password policies reflect CJIS Security Policy requirements. Do not weaken defaults without explicit compliance review.
- `SYNTHETIC_USERS` are for local development and testing only — never reference real user data. Their `roleIds` should come from `@casemind/rbac`, not ad hoc literals.
- Property-based tests (fast-check) are used for crypto and policy validation. Maintain this coverage for security-critical paths.