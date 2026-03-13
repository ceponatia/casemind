import { describe, expect, it } from "vitest";

import type {
  FieldAccessCheckInput,
  FieldPermissionDecision,
  PermissionCheckInput,
  PermissionDecision,
} from "../types.js";

export interface AuthorizationPolicyContract {
  evaluatePermission(input: PermissionCheckInput): PermissionDecision;
  evaluateFieldAccess(input: FieldAccessCheckInput): FieldPermissionDecision;
}

export function runAuthorizationPolicyContractSuite(
  name: string,
  createContract: () => AuthorizationPolicyContract,
): void {
  describe(name, () => {
    it("fails closed for cross-tenant requests", () => {
      const contract = createContract();
      const decision = contract.evaluatePermission({
        actorUserId: "user-1",
        tenantId: "tenant-a",
        roleIds: ["office-admin"],
        action: "read",
        resourceType: "criminal_case",
        resourceTenantId: "tenant-b",
      });

      expect(decision.allowed).toBe(false);
      expect(decision.requiresBreakGlass).toBeUndefined();
    });

    it("never exposes sealed fields without break-glass", () => {
      const contract = createContract();
      const decision = contract.evaluateFieldAccess({
        actorUserId: "user-1",
        tenantId: "tenant-a",
        roleIds: ["division-chief"],
        action: "read",
        resourceType: "document",
        resourceTenantId: "tenant-a",
        sensitivityTag: "sealed_record",
        fieldId: "sealed_record",
      });

      expect(decision.access).toBe("deny");
      expect(decision.requiresBreakGlass).toBe(true);
    });
  });
}