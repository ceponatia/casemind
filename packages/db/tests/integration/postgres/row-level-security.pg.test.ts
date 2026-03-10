import { describe, expect, it } from "vitest";

import { startPostgresTestInstance } from "@casemind/test-utils";

import {
  applyPostgresMigrations,
  buildApplicationRoleConnectionString,
  createPostgresPool,
} from "../../../src/index.js";

describe("PostgreSQL row-level security", () => {
  it("enforces tenant filtering for the application role", async () => {
    const instance = await startPostgresTestInstance({
      database: "casemind_rls_test",
    });
    const adminPool = createPostgresPool(instance.connectionString);
    const appPool = createPostgresPool(
      buildApplicationRoleConnectionString(instance.connectionString),
    );

    try {
      await applyPostgresMigrations(instance.connectionString);

      await adminPool.query(
        "INSERT INTO tenants (id, slug, display_name) VALUES ($1, $2, $3), ($4, $5, $6)",
        [
          "tenant-a",
          "tenant-a",
          "Tenant A",
          "tenant-b",
          "tenant-b",
          "Tenant B",
        ],
      );

      const tenantAClient = await appPool.connect();

      try {
        await tenantAClient.query("BEGIN");
        await tenantAClient.query(
          "SELECT set_config('app.current_tenant_id', $1, true)",
          ["tenant-a"],
        );
        await tenantAClient.query(
          "INSERT INTO users (id, tenant_id, email, display_name, role, auth_provider) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            "user-a",
            "tenant-a",
            "tenant.a@casemind.local",
            "Tenant A User",
            "office-admin",
            "credentials",
          ],
        );
        await tenantAClient.query("SAVEPOINT before_cross_tenant_insert");
        await expect(
          tenantAClient.query(
            "INSERT INTO users (id, tenant_id, email, display_name, role, auth_provider) VALUES ($1, $2, $3, $4, $5, $6)",
            [
              "user-b",
              "tenant-b",
              "tenant.b@casemind.local",
              "Tenant B User",
              "office-admin",
              "credentials",
            ],
          ),
        ).rejects.toThrow();
        await tenantAClient.query(
          "ROLLBACK TO SAVEPOINT before_cross_tenant_insert",
        );
        const visibleRows = await tenantAClient.query(
          "SELECT tenant_id, email FROM users ORDER BY email ASC",
        );
        await tenantAClient.query("COMMIT");

        expect(visibleRows.rows).toEqual([
          {
            tenant_id: "tenant-a",
            email: "tenant.a@casemind.local",
          },
        ]);
      } finally {
        tenantAClient.release();
      }
    } finally {
      await adminPool.end();
      await appPool.end();
      await instance.stop();
    }
  });
});
