import { randomUUID } from "node:crypto";

import type { CaseRepository, RepositoryContext } from "../contracts.js";
import type {
  CaseStatusCount,
  CriminalCase,
  NACase,
  NewCriminalCase,
  NewNACase,
} from "../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function requireContext(context: RepositoryContext): void {
  if (context.tenantId.length === 0 || context.actorUserId.length === 0) {
    throw new Error("Repository context requires tenantId and actorUserId.");
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryCaseRepository implements CaseRepository {
  private readonly criminalCases = new Map<string, CriminalCase>();
  private readonly naCases = new Map<string, NACase>();

  public async createCriminalCase(
    context: RepositoryContext,
    input: NewCriminalCase,
  ): Promise<CriminalCase> {
    await Promise.resolve();
    requireContext(context);
    const timestamp = nowIso();
    const criminalCase: CriminalCase = {
      id: input.id ?? randomUUID(),
      tenantId: context.tenantId,
      createdAt: timestamp,
      updatedAt: timestamp,
      caseNumber: input.caseNumber,
      status: input.status,
      court: input.court,
      ...(input.filedAt === undefined ? {} : { filedAt: input.filedAt }),
      defendantPersonIds: [...input.defendantPersonIds],
      victimPersonIds: [...input.victimPersonIds],
      chargeIds: [...input.chargeIds],
    };
    this.criminalCases.set(
      this.scopedKey(context.tenantId, criminalCase.id),
      criminalCase,
    );
    return clone(criminalCase);
  }

  public async getCriminalCaseById(
    context: RepositoryContext,
    caseId: string,
  ): Promise<CriminalCase | null> {
    await Promise.resolve();
    requireContext(context);
    return clone(
      this.criminalCases.get(this.scopedKey(context.tenantId, caseId)) ?? null,
    );
  }

  public async updateCriminalCase(
    context: RepositoryContext,
    caseId: string,
    patch: Partial<NewCriminalCase>,
  ): Promise<CriminalCase> {
    await Promise.resolve();
    requireContext(context);
    const key = this.scopedKey(context.tenantId, caseId);
    const existing = this.criminalCases.get(key);

    if (existing === undefined) {
      throw new Error(`Criminal case not found: ${caseId}`);
    }

    const updated: CriminalCase = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    };
    this.criminalCases.set(key, updated);
    return clone(updated);
  }

  public async listCriminalCases(
    context: RepositoryContext,
  ): Promise<CriminalCase[]> {
    await Promise.resolve();
    requireContext(context);
    return [...this.criminalCases.values()]
      .filter((record) => record.tenantId === context.tenantId)
      .sort((left, right) => left.caseNumber.localeCompare(right.caseNumber))
      .map((record) => clone(record));
  }

  public async summarizeCriminalCaseStatuses(
    context: RepositoryContext,
  ): Promise<CaseStatusCount[]> {
    await Promise.resolve();
    requireContext(context);
    const counts = new Map<string, number>();

    for (const criminalCase of this.criminalCases.values()) {
      if (criminalCase.tenantId !== context.tenantId) {
        continue;
      }

      counts.set(
        criminalCase.status,
        (counts.get(criminalCase.status) ?? 0) + 1,
      );
    }

    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => ({ status, count }));
  }

  public async createNACase(
    context: RepositoryContext,
    input: NewNACase,
  ): Promise<NACase> {
    await Promise.resolve();
    requireContext(context);
    const timestamp = nowIso();
    const naCase: NACase = {
      id: input.id ?? randomUUID(),
      tenantId: context.tenantId,
      createdAt: timestamp,
      updatedAt: timestamp,
      petitionNumber: input.petitionNumber,
      status: input.status,
      childPersonIds: [...input.childPersonIds],
      respondentPersonIds: [...input.respondentPersonIds],
      ...(input.familyUnitId === undefined
        ? {}
        : { familyUnitId: input.familyUnitId }),
      servicePlanIds: [...input.servicePlanIds],
    };
    this.naCases.set(this.scopedKey(context.tenantId, naCase.id), naCase);
    return clone(naCase);
  }

  public async getNACaseById(
    context: RepositoryContext,
    caseId: string,
  ): Promise<NACase | null> {
    await Promise.resolve();
    requireContext(context);
    return clone(
      this.naCases.get(this.scopedKey(context.tenantId, caseId)) ?? null,
    );
  }

  public async updateNACase(
    context: RepositoryContext,
    caseId: string,
    patch: Partial<NewNACase>,
  ): Promise<NACase> {
    await Promise.resolve();
    requireContext(context);
    const key = this.scopedKey(context.tenantId, caseId);
    const existing = this.naCases.get(key);

    if (existing === undefined) {
      throw new Error(`NA case not found: ${caseId}`);
    }

    const updated: NACase = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    };
    this.naCases.set(key, updated);
    return clone(updated);
  }

  public async listNACases(context: RepositoryContext): Promise<NACase[]> {
    await Promise.resolve();
    requireContext(context);
    return [...this.naCases.values()]
      .filter((record) => record.tenantId === context.tenantId)
      .sort((left, right) =>
        left.petitionNumber.localeCompare(right.petitionNumber),
      )
      .map((record) => clone(record));
  }

  private scopedKey(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
