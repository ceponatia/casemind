# CaseMind Copilot Instructions

CaseMind is a greenfield, CJIS-aligned case management platform for prosecutor offices. Favor secure, explicit, maintainable implementations over speed hacks or speculative abstractions.

## Project context

- Treat this repository as a pnpm monorepo anchored by the workspace root scripts in `package.json`.
- Preserve the local-first, cloud-ready direction: local development should work with containerized dependencies and synthetic data, while production-target infrastructure remains compatible with AWS GovCloud.
- Keep multi-tenancy, auditability, and CJIS-oriented controls visible in design decisions. If a change affects isolation, access control, retention, encryption, or traceability, address that impact explicitly.
- The current product scope is foundational platform work for prosecutor case management, not a generic CRUD app. Avoid introducing domain assumptions that conflict with the active planning documents.

## Working style

- Read the relevant plan or phase document in the `documents` workspace before making structural changes that touch architecture, infrastructure, security, tenancy, or testing strategy.
- Prefer minimal, composable changes that move the active phase forward without inventing adjacent systems.
- Do not silently fill in missing legal, compliance, or workflow requirements. Surface the gap and ask.
- Keep documentation and implementation aligned. If a substantial code change invalidates an active plan or phase document, update the related document by default when the impact is clear.

## Architecture guardrails

- Keep TypeScript-first contracts explicit at package boundaries.
- Follow the per-package test layout described in the planning docs: package-local `tests/` folders, shared helpers in `packages/test-utils`, and Testcontainers for database-backed integration tests.
- Prefer synthetic and fixture data for local and CI work. Never assume access to production data or CJI.
- For new platform capabilities, choose designs that preserve tenant isolation and auditable behavior by default.
- If a request would materially change the planned architecture, explain the tradeoff instead of quietly drifting from the plan.

## Use `#tool:vscode_askQuestions` when needed

Use `#tool:vscode_askQuestions` instead of guessing when any of these are unclear:

- Which workspace root owns the task: the application repo, the planning-docs repo, or both.
- Whether the user wants planning-only changes, implementation-only changes, or both.
- Which phase or plan governs the requested work.
- Whether the change targets criminal-case workflows, neglect-abuse workflows, or shared platform primitives.
- Whether a requirement is a hard compliance constraint, a product preference, or an MVP shortcut.
- Which datastore should own a new concern when the choice affects relational integrity, document flexibility, search behavior, or tenant isolation.
- Whether a new dependency, managed service, or cloud cost is acceptable.
- What the acceptance criteria are when the request is broad, ambiguous, or spans multiple packages.
- Whether a document update is expected as part of the task.

Keep these questions short and decision-oriented. Ask only the minimum needed to unblock implementation.

## Validation

- Run the narrowest relevant validation first, then expand only as needed.
- Prefer workspace scripts such as `pnpm lint`, `pnpm typecheck`, `pnpm test`, and package-filtered equivalents.
- When infrastructure or integration behavior changes, validate the affected test or container path instead of relying only on static review.