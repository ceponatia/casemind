import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { InMemoryCaseRepository } from "../../src/testing/in-memory-case-repository.js";
import {
  createAuditedRepositories,
  createRelationalAuthAuditSink,
  normalizeAuditMetadata,
} from "../../src/index.js";

describe("audit utilities", () => {
  it("accepts primitive-only metadata via property testing", () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
        ),
        (metadata) => {
          expect(normalizeAuditMetadata(metadata)).toEqual(metadata);
        },
      ),
    );
  });

  it("rejects nested metadata structures", () => {
    expect(() =>
      normalizeAuditMetadata({
        bad: { nested: true } as unknown as string,
      }),
    ).toThrow(/primitive/i);
  });

  it("emits audit records from repository wrappers", async () => {
    const appendedAuditLogs: unknown[] = [];
    const repositories = createAuditedRepositories({
      relationalRepository: {
        appendAuditLog(context, input) {
          appendedAuditLogs.push({ context, input });
          return Promise.resolve({
            id: "audit-1",
            tenantId: context.tenantId,
            ...(input.actorUserId === undefined
              ? {}
              : { actorUserId: input.actorUserId }),
            action: input.action,
            outcome: input.outcome ?? "succeeded",
            resourceType: input.resourceType,
            ...(input.resourceId === undefined
              ? {}
              : { resourceId: input.resourceId }),
            metadata: input.metadata ?? {},
            ...(input.sourceIp === undefined
              ? {}
              : { sourceIp: input.sourceIp }),
            ...(input.userAgent === undefined
              ? {}
              : { userAgent: input.userAgent }),
            ...(input.deviceFingerprint === undefined
              ? {}
              : { deviceFingerprint: input.deviceFingerprint }),
            ...(input.justification === undefined
              ? {}
              : { justification: input.justification }),
            ...(input.requestId === undefined
              ? {}
              : { requestId: input.requestId }),
            ...(input.correlationId === undefined
              ? {}
              : { correlationId: input.correlationId }),
            occurredAt: input.occurredAt ?? "2026-03-12T10:00:00.000Z",
            createdAt: "2026-03-12T10:00:00.000Z",
          });
        },
      },
      caseRepository: new InMemoryCaseRepository(),
      personRepository: {
        createPerson: (_context, input) =>
          Promise.resolve({
            id: input.id ?? "person-1",
            tenantId: "tenant-a",
            createdAt: "2026-03-12T10:00:00.000Z",
            updatedAt: "2026-03-12T10:00:00.000Z",
            firstName: input.firstName,
            lastName: input.lastName,
            ...(input.dateOfBirth === undefined
              ? {}
              : { dateOfBirth: input.dateOfBirth }),
            roleTags: [...input.roleTags],
            externalIdentifiers: [...input.externalIdentifiers],
          }),
        getPersonById: () => Promise.resolve(null),
        listPeopleByIds: () => Promise.resolve([]),
      },
      catalogRepository: {
        createDocument: (_context, input) =>
          Promise.resolve({
            id: input.id ?? "document-1",
            tenantId: "tenant-a",
            createdAt: "2026-03-12T10:00:00.000Z",
            updatedAt: "2026-03-12T10:00:00.000Z",
            caseId: input.caseId,
            title: input.title,
            documentType: input.documentType,
            storageKey: input.storageKey,
            classification: input.classification,
            ...(input.textContent === undefined
              ? {}
              : { textContent: input.textContent }),
          }),
        listDocumentsByCase: () => Promise.resolve([]),
        createEvidence: (_context, input) =>
          Promise.resolve({
            id: input.id ?? "evidence-1",
            tenantId: "tenant-a",
            createdAt: "2026-03-12T10:00:00.000Z",
            updatedAt: "2026-03-12T10:00:00.000Z",
            caseId: input.caseId,
            evidenceNumber: input.evidenceNumber,
            documentIds: [...input.documentIds],
            chainOfCustody: [...input.chainOfCustody],
            description: input.description,
          }),
        listEvidenceByCase: () => Promise.resolve([]),
        createFamilyUnit: (_context, input) =>
          Promise.resolve({
            id: input.id ?? "family-unit-1",
            tenantId: "tenant-a",
            createdAt: "2026-03-12T10:00:00.000Z",
            updatedAt: "2026-03-12T10:00:00.000Z",
            caseId: input.caseId,
            childPersonIds: [...input.childPersonIds],
            adultPersonIds: [...input.adultPersonIds],
            address: input.address,
          }),
        getFamilyUnitById: () => Promise.resolve(null),
        createServicePlan: (_context, input) =>
          Promise.resolve({
            id: input.id ?? "service-plan-1",
            tenantId: "tenant-a",
            createdAt: "2026-03-12T10:00:00.000Z",
            updatedAt: "2026-03-12T10:00:00.000Z",
            caseId: input.caseId,
            goal: input.goal,
            status: input.status,
            taskIds: [...input.taskIds],
          }),
        listServicePlansByCase: () => Promise.resolve([]),
      },
    });

    await repositories.caseRepository.createCriminalCase(
      {
        tenantId: "tenant-a",
        actorUserId: "user-a",
      },
      {
        id: "case-1",
        caseNumber: "2026-CR-1",
        status: "screening",
        court: "Circuit",
        defendantPersonIds: [],
        victimPersonIds: [],
        chargeIds: [],
      },
    );

    expect(appendedAuditLogs).toHaveLength(1);
    expect(appendedAuditLogs[0]).toMatchObject({
      context: {
        tenantId: "tenant-a",
        actorUserId: "user-a",
      },
      input: {
        action: "create",
        resourceType: "criminal_case",
        resourceId: "case-1",
      },
    });
  });

  it("maps auth audit events into relational audit writes", async () => {
    const calls: Array<{ context: unknown; input: unknown }> = [];
    const sink = createRelationalAuthAuditSink({
      relationalRepository: {
        appendAuditLog(context, input) {
          calls.push({ context, input });
          return Promise.resolve({
            id: "audit-auth-1",
            tenantId: context.tenantId,
            ...(input.actorUserId === undefined
              ? {}
              : { actorUserId: input.actorUserId }),
            action: input.action,
            outcome: input.outcome ?? "succeeded",
            resourceType: input.resourceType,
            ...(input.resourceId === undefined
              ? {}
              : { resourceId: input.resourceId }),
            metadata: input.metadata ?? {},
            ...(input.sourceIp === undefined
              ? {}
              : { sourceIp: input.sourceIp }),
            ...(input.userAgent === undefined
              ? {}
              : { userAgent: input.userAgent }),
            ...(input.deviceFingerprint === undefined
              ? {}
              : { deviceFingerprint: input.deviceFingerprint }),
            ...(input.justification === undefined
              ? {}
              : { justification: input.justification }),
            ...(input.requestId === undefined
              ? {}
              : { requestId: input.requestId }),
            ...(input.correlationId === undefined
              ? {}
              : { correlationId: input.correlationId }),
            occurredAt: input.occurredAt ?? "2026-03-12T11:00:00.000Z",
            createdAt: "2026-03-12T11:00:00.000Z",
          });
        },
      },
      defaultTenantId: "tenant-local-demo",
    });

    await sink.record({
      type: "auth.login.failed",
      occurredAt: "2026-03-12T11:00:00.000Z",
      email: "apa@local.casemind.test",
      reason: "invalid_credentials",
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      context: {
        tenantId: "tenant-local-demo",
        actorUserId: "system:auth-service",
      },
      input: {
        actorUserId: "system:auth-service",
        action: "login",
        outcome: "failed",
        resourceType: "auth_credentials",
        metadata: {
          eventType: "auth.login.failed",
          email: "apa@local.casemind.test",
          reason: "invalid_credentials",
        },
      },
    });
  });
});
