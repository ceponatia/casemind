import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CaseRepository, RepositoryContext } from "../contracts.js";

export interface CaseRepositoryContractHarness {
  repository: CaseRepository;
  primaryContext: RepositoryContext;
  secondaryContext: RepositoryContext;
  cleanup(): Promise<void>;
}

export function runCaseRepositoryContractSuite(
  label: string,
  setup: () => Promise<CaseRepositoryContractHarness>,
): void {
  describe(`${label} case repository contract`, () => {
    let harness: CaseRepositoryContractHarness;

    beforeEach(async () => {
      harness = await setup();
    });

    afterEach(async () => {
      await harness.cleanup();
    });

    it("creates, retrieves, and updates criminal cases within a tenant scope", async () => {
      const created = await harness.repository.createCriminalCase(
        harness.primaryContext,
        {
          id: "contract-criminal-case",
          caseNumber: "2026-CR-9001",
          status: "screening",
          court: "Circuit",
          defendantPersonIds: ["person-1"],
          victimPersonIds: ["person-2"],
          chargeIds: ["charge-1"],
        },
      );

      const loaded = await harness.repository.getCriminalCaseById(
        harness.primaryContext,
        created.id,
      );

      expect(loaded).not.toBeNull();
      expect(loaded?.tenantId).toBe(harness.primaryContext.tenantId);

      const updated = await harness.repository.updateCriminalCase(
        harness.primaryContext,
        created.id,
        {
          status: "arraigned",
        },
      );

      expect(updated.status).toBe("arraigned");
    });

    it("does not leak criminal cases across tenants", async () => {
      const created = await harness.repository.createCriminalCase(
        harness.primaryContext,
        {
          id: "contract-isolation-case",
          caseNumber: "2026-CR-9002",
          status: "screening",
          court: "District",
          defendantPersonIds: [],
          victimPersonIds: [],
          chargeIds: [],
        },
      );

      const loaded = await harness.repository.getCriminalCaseById(
        harness.secondaryContext,
        created.id,
      );

      expect(loaded).toBeNull();
    });

    it("summarizes statuses per tenant only", async () => {
      await harness.repository.createCriminalCase(harness.primaryContext, {
        id: "contract-summary-1",
        caseNumber: "2026-CR-9100",
        status: "screening",
        court: "Circuit",
        defendantPersonIds: [],
        victimPersonIds: [],
        chargeIds: [],
      });
      await harness.repository.createCriminalCase(harness.primaryContext, {
        id: "contract-summary-2",
        caseNumber: "2026-CR-9101",
        status: "screening",
        court: "Circuit",
        defendantPersonIds: [],
        victimPersonIds: [],
        chargeIds: [],
      });
      await harness.repository.createCriminalCase(harness.secondaryContext, {
        id: "contract-summary-3",
        caseNumber: "2026-CR-9102",
        status: "arraigned",
        court: "Circuit",
        defendantPersonIds: [],
        victimPersonIds: [],
        chargeIds: [],
      });

      const summary = await harness.repository.summarizeCriminalCaseStatuses(
        harness.primaryContext,
      );

      expect(summary).toEqual([{ status: "screening", count: 2 }]);
    });
  });
}
