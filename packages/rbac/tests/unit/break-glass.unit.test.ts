import { describe, expect, it } from "vitest";

import {
  MIN_BREAK_GLASS_JUSTIFICATION_LENGTH,
  authorizeBreakGlassAccess,
} from "../../src/index.js";

describe("authorizeBreakGlassAccess", () => {
  it("records a break-glass audit event for eligible roles", async () => {
    const recordedEvents: unknown[] = [];
    const result = await authorizeBreakGlassAccess(
      {
        actorUserId: "user-chief-1",
        tenantId: "tenant-a",
        roleIds: ["division-chief"],
        action: "read",
        resourceType: "criminal_case",
        resourceTenantId: "tenant-a",
        resourceId: "criminal-001",
        sensitivityTag: "sensitive_case",
        assignedUserIds: ["user-apa-1"],
        justification: "Immediate supervisory review for emergency hearing prep.",
      },
      {
        auditSink: {
          record(event) {
            recordedEvents.push(event);
          },
        },
      },
    );

    expect(result.allowed).toBe(true);
    expect(result.wasBreakGlass).toBe(true);
    expect(recordedEvents).toHaveLength(1);
  });

  it("rejects low-signal justifications", async () => {
    await expect(
      authorizeBreakGlassAccess({
        actorUserId: "user-chief-1",
        tenantId: "tenant-a",
        roleIds: ["division-chief"],
        action: "read",
        resourceType: "criminal_case",
        resourceTenantId: "tenant-a",
        sensitivityTag: "sensitive_case",
        assignedUserIds: ["user-apa-1"],
        justification: "x".repeat(MIN_BREAK_GLASS_JUSTIFICATION_LENGTH - 1),
      }),
    ).rejects.toThrow(/Break-glass justification/);
  });
});