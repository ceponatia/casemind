# Environment Boundaries

CaseMind uses synthetic data outside production. No real CJI is permitted in local development, CI, or staging.

## Local development

- Runs exclusively on the developer machine through Docker Compose and Testcontainers.
- Uses synthetic tenants, synthetic users, and synthetic case data only.
- Stores documents in MinIO rather than AWS S3.

## CI

- Runs the same TypeScript, Vitest, and Testcontainers workflows as local development.
- Must not access production infrastructure or production credentials.
- May run Atlas smoke tests only after a dedicated non-production Atlas environment exists.

## Staging

- Reserved for future GovCloud-target deployment validation.
- Must continue using synthetic data.
- Will become the only allowed target for Atlas smoke tests once implemented.

## Production

- Reserved for CJIS-controlled environments and real tenant onboarding.
- Must remain isolated from developer and CI credentials.
- Requires cloud-only controls deferred from local Phase 1 work, including KMS-backed encryption, WAF, CloudTrail, GuardDuty, and managed service configuration.
