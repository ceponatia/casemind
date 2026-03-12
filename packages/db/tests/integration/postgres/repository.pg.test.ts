import { describe, expect, it } from "vitest";

import { startPostgresTestInstance } from "@casemind/test-utils";

import {
  PostgresRelationalRepository,
  applyPostgresMigrations,
  buildApplicationRoleConnectionString,
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
          role: "office-admin",
          authProvider: "credentials",
        });
        await repository.appendAuditLog(context, {
          actorUserId: user.id,
          action: "case.view",
          entityType: "case",
          entityId: "criminal-100",
          detail: {
            reason: "integration-test",
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
        const notifications = await repository.listNotifications(context);
        const aiInteractions =
          await repository.listAiInteractionPlaceholders(context);

        expect(users).toHaveLength(1);
        expect(auditLogs).toHaveLength(1);
        expect(notifications).toHaveLength(1);
        expect(aiInteractions).toHaveLength(1);
      } finally {
        await repository.close();
      }
    } finally {
      await instance.stop();
    }
  });
});
