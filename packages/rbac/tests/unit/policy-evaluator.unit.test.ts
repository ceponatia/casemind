import { describe, expect, it } from "vitest";

import { evaluateFieldAccess, evaluatePermission } from "../../src/index.js";

describe("evaluatePermission", () => {
  it("denies cross-tenant access without break-glass", () => {
    const decision = evaluatePermission({
      actorUserId: "user-a",
      tenantId: "tenant-a",
      roleIds: ["office-admin"],
      action: "read",
      resourceType: "criminal_case",
      resourceTenantId: "tenant-b",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.requiresBreakGlass).toBeUndefined();
  });

  it("allows assigned prosecutors to access sensitive cases", () => {
    const decision = evaluatePermission({
      actorUserId: "user-apa-1",
      tenantId: "tenant-a",
      roleIds: ["apa"],
      action: "read",
      resourceType: "criminal_case",
      resourceTenantId: "tenant-a",
      sensitivityTag: "sensitive_case",
      assignedUserIds: ["user-apa-1"],
    });

    expect(decision.allowed).toBe(true);
  });

  it("requires break-glass for unassigned chiefs on sensitive cases", () => {
    const decision = evaluatePermission({
      actorUserId: "user-chief-1",
      tenantId: "tenant-a",
      roleIds: ["division-chief"],
      action: "read",
      resourceType: "criminal_case",
      resourceTenantId: "tenant-a",
      sensitivityTag: "sensitive_case",
      assignedUserIds: ["user-apa-1"],
    });

    expect(decision).toMatchObject({
      allowed: false,
      requiresBreakGlass: true,
    });
  });
});

describe("evaluateFieldAccess", () => {
  it("redacts SSN values for legal assistants", () => {
    const decision = evaluateFieldAccess({
      actorUserId: "user-legal-1",
      tenantId: "tenant-a",
      roleIds: ["legal-assistant"],
      action: "read",
      resourceType: "person",
      resourceTenantId: "tenant-a",
      fieldId: "ssn",
    });

    expect(decision).toMatchObject({
      access: "redact",
      canUpdate: false,
    });
  });

  it("requires break-glass for sealed fields", () => {
    const decision = evaluateFieldAccess({
      actorUserId: "user-admin-1",
      tenantId: "tenant-a",
      roleIds: ["office-admin"],
      action: "read",
      resourceType: "document",
      resourceTenantId: "tenant-a",
      sensitivityTag: "sealed_record",
      fieldId: "sealed_record",
    });

    expect(decision).toMatchObject({
      access: "deny",
      requiresBreakGlass: true,
    });
  });
});