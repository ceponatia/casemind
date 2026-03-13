import { describe, expect, it } from "vitest";

import {
  authorizeBreakGlassAccess,
  withAuthorization,
} from "../../src/index.js";

describe("authorization flow integration", () => {
  it("supports normal access and break-glass access through the public API", async () => {
    const normalResult = await withAuthorization(
      {
        actorUserId: "user-apa-1",
        tenantId: "tenant-a",
        roleIds: ["apa"],
        action: "read",
        resourceType: "criminal_case",
        resourceTenantId: "tenant-a",
      },
      () => "normal",
    );
    const elevatedResult = await authorizeBreakGlassAccess({
      actorUserId: "user-chief-1",
      tenantId: "tenant-a",
      roleIds: ["division-chief"],
      action: "read",
      resourceType: "criminal_case",
      resourceTenantId: "tenant-a",
      resourceId: "criminal-001",
      sensitivityTag: "sensitive_case",
      assignedUserIds: ["user-apa-1"],
      justification: "Immediate supervisory review needed before on-call hearing.",
    });

    expect(normalResult).toBe("normal");
    expect(elevatedResult.allowed).toBe(true);
    expect(elevatedResult.wasBreakGlass).toBe(true);
  });
});