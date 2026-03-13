import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { evaluatePermission } from "../../src/index.js";

describe("evaluatePermission property tests", () => {
  it("always denies cross-tenant access", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.constantFrom("office-admin", "division-chief", "apa", "juvenile-apa"),
        (tenantId, resourceTenantId, roleId) => {
          fc.pre(tenantId !== resourceTenantId);

          const decision = evaluatePermission({
            actorUserId: "user-1",
            tenantId,
            roleIds: [roleId],
            action: "read",
            resourceType: "criminal_case",
            resourceTenantId,
          });

          expect(decision.allowed).toBe(false);
          expect(decision.requiresBreakGlass).toBeUndefined();
        },
      ),
    );
  });
});