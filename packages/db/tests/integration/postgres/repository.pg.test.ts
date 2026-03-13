import { describe, expect, it } from "vitest";

import { startPostgresTestInstance } from "@casemind/test-utils";

import {
  PostgresRelationalRepository,
  applyPostgresMigrations,
  buildApplicationRoleConnectionString,
  createRelationalAuthorizationAuditSink,
  createPostgresPool,
  provisionPostgresApplicationRole,
} from "../../../src/index.js";

describe("Postgres relational repository", () => {
  it("persists tenant-scoped relational records", async () => {
    const instance = await startPostgresTestInstance({
      database: "casemind_repo_test",
    });
    const appRole = {
      username: "casemind_app",
      password: "casemind_app_test_only",
    };

    try {
      await applyPostgresMigrations(instance.connectionString);
      await provisionPostgresApplicationRole(
        instance.connectionString,
        appRole,
      );
      const appPool = createPostgresPool(
        buildApplicationRoleConnectionString(
          instance.connectionString,
          appRole,
        ),
      );
      const repository = new PostgresRelationalRepository(
        createPostgresPool(
          buildApplicationRoleConnectionString(
            instance.connectionString,
            appRole,
          ),
        ),
      );
      try {
        const context = {
          tenantId: "tenant-demo",
          actorUserId: "user-admin",
        };

        await repository.createTenant(context, {
          id: context.tenantId,
          slug: "tenant-demo",
          displayName: "Tenant Demo",
        });
        const user = await repository.createUser(context, {
          id: context.actorUserId,
          email: "office.admin@casemind.local",
          displayName: "Office Admin",
          roleIds: ["office-admin"],
          authProvider: "credentials",
        });
        await createRelationalAuthorizationAuditSink({
          relationalRepository: repository,
        }).record({
          tenantId: context.tenantId,
          actorUserId: user.id,
          action: "break_glass",
          outcome: "succeeded",
          resourceType: "criminal_case",
          resourceId: "criminal-100",
          metadata: {
            originalAction: "read",
            sensitivityTag: "sensitive_case",
          },
          justification: "Emergency supervisory review before an after-hours hearing.",
          occurredAt: "2026-03-12T13:30:00.000Z",
        });
        await repository.appendAuditLog(context, {
          actorUserId: user.id,
          action: "view",
          outcome: "succeeded",
          resourceType: "criminal_case",
          resourceId: "criminal-100",
          metadata: {
            reason: "integration-test",
          },
          userAgent: "vitest",
        });
        await repository.appendAuditLog(context, {
          actorUserId: user.id,
          action: "update",
          outcome: "failed",
          resourceType: "criminal_case",
          resourceId: "criminal-100",
          metadata: {
            reason: "missing-record",
          },
        });
        await repository.createCalendarEvent(context, {
          title: "Arraignment",
          startsAt: "2026-03-12T14:00:00.000Z",
          endsAt: "2026-03-12T14:30:00.000Z",
        });
        await repository.createNotification(context, {
          userId: user.id,
          title: "Reminder",
          body: "Arraignment starts soon.",
          severity: "info",
        });
        await repository.createAiInteractionPlaceholder(context, {
          purpose: "future-summary",
          status: "pending",
          metadata: {
            caseId: "criminal-100",
          },
        });

        const users = await repository.listUsers(context);
        const auditLogs = await repository.listAuditLogEntries(context);
        const firstPage = await repository.queryAuditLogEntries(context, {
          resourceType: "criminal_case",
          limit: 1,
        });
        const secondPage = await repository.queryAuditLogEntries(context, {
          resourceType: "criminal_case",
          limit: 1,
          ...(firstPage.nextCursor === undefined
            ? {}
            : { cursor: firstPage.nextCursor }),
        });
        const notifications = await repository.listNotifications(context);
        const aiInteractions =
          await repository.listAiInteractionPlaceholders(context);

        expect(users).toHaveLength(1);
        expect(auditLogs).toHaveLength(3);
        expect(auditLogs.some((entry) => entry.action === "break_glass")).toBe(
          true,
        );
        expect(firstPage.entries).toHaveLength(1);
        expect(firstPage.nextCursor).toBeDefined();
        expect(secondPage.entries).toHaveLength(1);
        expect(notifications).toHaveLength(1);
        expect(aiInteractions).toHaveLength(1);

        const auditClient = await appPool.connect();

        try {
          await auditClient.query("BEGIN");
          await auditClient.query(
            "SELECT set_config('app.current_tenant_id', $1, true)",
            [context.tenantId],
          );
          await auditClient.query(
            "SELECT set_config('app.current_actor_user_id', $1, true)",
            [context.actorUserId],
          );
          await auditClient.query("SAVEPOINT before_audit_update");
          await expect(
            auditClient.query(
              "UPDATE audit_log_entries SET justification = $1 WHERE tenant_id = $2",
              ["should-fail", context.tenantId],
            ),
          ).rejects.toThrow(/append-only|permission/i);
          await auditClient.query("ROLLBACK TO SAVEPOINT before_audit_update");
          await auditClient.query("SAVEPOINT before_audit_delete");
          await expect(
            auditClient.query(
              "DELETE FROM audit_log_entries WHERE tenant_id = $1",
              [context.tenantId],
            ),
          ).rejects.toThrow(/append-only|permission/i);
          await auditClient.query("ROLLBACK TO SAVEPOINT before_audit_delete");
          await auditClient.query("ROLLBACK");
        } finally {
          auditClient.release();
        }
      } finally {
        await repository.close();
        await appPool.end();
      }
    } finally {
      await instance.stop();
    }
  });
});
