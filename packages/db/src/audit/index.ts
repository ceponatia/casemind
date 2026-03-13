import type {
  CatalogRepository,
  CaseRepository,
  PersonRepository,
  RelationalRepository,
  RepositoryContext,
} from "../contracts.js";
import type { AuthorizationAuditEvent } from "@casemind/rbac";
import type {
  AuditLogAction,
  AuditLogEntry,
  AuditLogOutcome,
  AuditLogQuery,
  AuditMetadata,
  AuditMetadataValue,
  CriminalCase,
  DocumentRecord,
  EvidenceRecord,
  FamilyUnit,
  NACase,
  NewAuditLogEntry,
  Person,
  ServicePlan,
} from "../types.js";

const DEFAULT_AUDIT_QUERY_LIMIT = 50;
const MAX_AUDIT_QUERY_LIMIT = 200;
const AUTH_SERVICE_ACTOR_USER_ID = "system:auth-service";

interface AuthAuditEventLike {
  type:
    | "auth.login.succeeded"
    | "auth.login.failed"
    | "auth.login.mfa_required"
    | "auth.mfa.enrollment.started"
    | "auth.mfa.enrollment.activated"
    | "auth.mfa.reset"
    | "auth.lockout.reset"
    | "auth.password.updated"
    | "auth.account.deactivated"
    | "auth.session.invalidated";
  occurredAt: string;
  userId?: string;
  tenantId?: string;
  email?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

export interface CreateRelationalAuthAuditSinkOptions {
  relationalRepository: Pick<RelationalRepository, "appendAuditLog">;
  defaultTenantId?: string;
  serviceActorUserId?: string;
}

export interface CreateRelationalAuthorizationAuditSinkOptions {
  relationalRepository: Pick<RelationalRepository, "appendAuditLog">;
}

export interface AuditedRepositories {
  caseRepository: CaseRepository;
  personRepository: PersonRepository;
  catalogRepository: CatalogRepository;
}

export interface CreateAuditedRepositoriesOptions {
  relationalRepository: Pick<RelationalRepository, "appendAuditLog">;
  caseRepository: CaseRepository;
  personRepository: PersonRepository;
  catalogRepository: CatalogRepository;
}

export function normalizeAuditMetadata(
  metadata: AuditMetadata = {},
): AuditMetadata {
  const normalizedEntries = Object.entries(metadata).map(([key, value]) => {
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean" &&
      value !== null
    ) {
      throw new Error(`Audit metadata value for ${key} must be a primitive.`);
    }

    return [key, value] satisfies [string, AuditMetadataValue];
  });

  return Object.fromEntries(normalizedEntries);
}

export function createAuditLogCursor(
  entry: Pick<AuditLogEntry, "id" | "occurredAt">,
): string {
  return `${entry.occurredAt}|${entry.id}`;
}

export function parseAuditLogCursor(cursor: string): {
  occurredAt: string;
  id: string;
} {
  const separatorIndex = cursor.indexOf("|");

  if (separatorIndex <= 0 || separatorIndex === cursor.length - 1) {
    throw new Error("Invalid audit log cursor.");
  }

  return {
    occurredAt: cursor.slice(0, separatorIndex),
    id: cursor.slice(separatorIndex + 1),
  };
}

export function resolveAuditLogQueryLimit(query: AuditLogQuery): number {
  const requestedLimit = query.limit ?? DEFAULT_AUDIT_QUERY_LIMIT;

  if (!Number.isInteger(requestedLimit) || requestedLimit <= 0) {
    throw new Error("Audit log query limit must be a positive integer.");
  }

  return Math.min(requestedLimit, MAX_AUDIT_QUERY_LIMIT);
}

function optionalStringProperty<Key extends string>(
  key: Key,
  value: string | undefined,
): { [Property in Key]?: string } {
  return value === undefined
    ? {}
    : ({ [key]: value } as { [Property in Key]?: string });
}

async function appendRepositoryAuditLog(
  relationalRepository: Pick<RelationalRepository, "appendAuditLog">,
  context: RepositoryContext,
  input: Omit<NewAuditLogEntry, "actorUserId"> & { actorUserId?: string },
): Promise<AuditLogEntry> {
  return relationalRepository.appendAuditLog(context, {
    ...input,
    actorUserId: input.actorUserId ?? context.actorUserId,
    metadata: normalizeAuditMetadata(input.metadata),
  });
}

function describeCaseMetadata(record: CriminalCase | NACase): AuditMetadata {
  if ("caseNumber" in record) {
    return {
      caseNumber: record.caseNumber,
      status: record.status,
      court: record.court,
    };
  }

  return {
    petitionNumber: record.petitionNumber,
    status: record.status,
  };
}

function createAuditedCaseRepository(
  relationalRepository: Pick<RelationalRepository, "appendAuditLog">,
  caseRepository: CaseRepository,
): CaseRepository {
  return {
    async createCriminalCase(context, input) {
      const criminalCase = await caseRepository.createCriminalCase(
        context,
        input,
      );
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "create",
        outcome: "succeeded",
        resourceType: "criminal_case",
        resourceId: criminalCase.id,
        metadata: describeCaseMetadata(criminalCase),
      });
      return criminalCase;
    },
    async getCriminalCaseById(context, caseId) {
      const criminalCase = await caseRepository.getCriminalCaseById(
        context,
        caseId,
      );
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "view",
        outcome: criminalCase === null ? "failed" : "succeeded",
        resourceType: "criminal_case",
        resourceId: caseId,
        metadata:
          criminalCase === null
            ? { lookup: "by_id", found: false }
            : {
                lookup: "by_id",
                found: true,
                ...describeCaseMetadata(criminalCase),
              },
      });
      return criminalCase;
    },
    async updateCriminalCase(context, caseId, patch) {
      const criminalCase = await caseRepository.updateCriminalCase(
        context,
        caseId,
        patch,
      );
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "update",
        outcome: "succeeded",
        resourceType: "criminal_case",
        resourceId: criminalCase.id,
        metadata: {
          patchFields: Object.keys(patch).sort().join(","),
          ...describeCaseMetadata(criminalCase),
        },
      });
      return criminalCase;
    },
    async listCriminalCases(context) {
      const criminalCases = await caseRepository.listCriminalCases(context);
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "view",
        outcome: "succeeded",
        resourceType: "criminal_case",
        metadata: {
          lookup: "list",
          resultCount: criminalCases.length,
        },
      });
      return criminalCases;
    },
    async summarizeCriminalCaseStatuses(context) {
      const summary =
        await caseRepository.summarizeCriminalCaseStatuses(context);
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "view",
        outcome: "succeeded",
        resourceType: "criminal_case_status_summary",
        metadata: {
          lookup: "summary",
          statusBucketCount: summary.length,
        },
      });
      return summary;
    },
    async createNACase(context, input) {
      const naCase = await caseRepository.createNACase(context, input);
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "create",
        outcome: "succeeded",
        resourceType: "na_case",
        resourceId: naCase.id,
        metadata: describeCaseMetadata(naCase),
      });
      return naCase;
    },
    async getNACaseById(context, caseId) {
      const naCase = await caseRepository.getNACaseById(context, caseId);
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "view",
        outcome: naCase === null ? "failed" : "succeeded",
        resourceType: "na_case",
        resourceId: caseId,
        metadata:
          naCase === null
            ? { lookup: "by_id", found: false }
            : { lookup: "by_id", found: true, ...describeCaseMetadata(naCase) },
      });
      return naCase;
    },
    async updateNACase(context, caseId, patch) {
      const naCase = await caseRepository.updateNACase(context, caseId, patch);
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "update",
        outcome: "succeeded",
        resourceType: "na_case",
        resourceId: naCase.id,
        metadata: {
          patchFields: Object.keys(patch).sort().join(","),
          ...describeCaseMetadata(naCase),
        },
      });
      return naCase;
    },
    async listNACases(context) {
      const naCases = await caseRepository.listNACases(context);
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "view",
        outcome: "succeeded",
        resourceType: "na_case",
        metadata: {
          lookup: "list",
          resultCount: naCases.length,
        },
      });
      return naCases;
    },
  };
}

function createAuditedPersonRepository(
  relationalRepository: Pick<RelationalRepository, "appendAuditLog">,
  personRepository: PersonRepository,
): PersonRepository {
  async function recordPersonAudit(
    context: RepositoryContext,
    action: AuditLogAction,
    outcome: AuditLogOutcome,
    person: Person | null,
    personId?: string,
  ): Promise<void> {
    await appendRepositoryAuditLog(relationalRepository, context, {
      action,
      outcome,
      resourceType: "person",
      ...optionalStringProperty("resourceId", person?.id ?? personId),
      metadata:
        person === null
          ? { found: false }
          : {
              found: true,
              firstName: person.firstName,
              lastName: person.lastName,
              roleCount: person.roleTags.length,
            },
    });
  }

  return {
    async createPerson(context, input) {
      const person = await personRepository.createPerson(context, input);
      await recordPersonAudit(context, "create", "succeeded", person);
      return person;
    },
    async getPersonById(context, personId) {
      const person = await personRepository.getPersonById(context, personId);
      await recordPersonAudit(
        context,
        "view",
        person === null ? "failed" : "succeeded",
        person,
        personId,
      );
      return person;
    },
    async listPeopleByIds(context, personIds) {
      const people = await personRepository.listPeopleByIds(context, personIds);
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "view",
        outcome: "succeeded",
        resourceType: "person",
        metadata: {
          lookup: "by_ids",
          requestedCount: personIds.length,
          resultCount: people.length,
        },
      });
      return people;
    },
  };
}

function createAuditedCatalogRepository(
  relationalRepository: Pick<RelationalRepository, "appendAuditLog">,
  catalogRepository: CatalogRepository,
): CatalogRepository {
  async function recordCatalogCreate(
    context: RepositoryContext,
    action: AuditLogAction,
    resourceType: string,
    record: DocumentRecord | EvidenceRecord | FamilyUnit | ServicePlan,
    metadata: AuditMetadata,
  ): Promise<void> {
    await appendRepositoryAuditLog(relationalRepository, context, {
      action,
      outcome: "succeeded",
      resourceType,
      resourceId: record.id,
      metadata,
    });
  }

  return {
    async createDocument(context, input) {
      const document = await catalogRepository.createDocument(context, input);
      await recordCatalogCreate(context, "create", "document", document, {
        caseId: document.caseId,
        documentType: document.documentType,
        classification: document.classification,
      });
      return document;
    },
    async listDocumentsByCase(context, caseId) {
      const documents = await catalogRepository.listDocumentsByCase(
        context,
        caseId,
      );
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "view",
        outcome: "succeeded",
        resourceType: "document",
        resourceId: caseId,
        metadata: {
          lookup: "by_case",
          caseId,
          resultCount: documents.length,
        },
      });
      return documents;
    },
    async createEvidence(context, input) {
      const evidence = await catalogRepository.createEvidence(context, input);
      await recordCatalogCreate(context, "create", "evidence", evidence, {
        caseId: evidence.caseId,
        evidenceNumber: evidence.evidenceNumber,
        documentCount: evidence.documentIds.length,
      });
      return evidence;
    },
    async listEvidenceByCase(context, caseId) {
      const evidence = await catalogRepository.listEvidenceByCase(
        context,
        caseId,
      );
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "view",
        outcome: "succeeded",
        resourceType: "evidence",
        resourceId: caseId,
        metadata: {
          lookup: "by_case",
          caseId,
          resultCount: evidence.length,
        },
      });
      return evidence;
    },
    async createFamilyUnit(context, input) {
      const familyUnit = await catalogRepository.createFamilyUnit(
        context,
        input,
      );
      await recordCatalogCreate(context, "create", "family_unit", familyUnit, {
        caseId: familyUnit.caseId,
        childCount: familyUnit.childPersonIds.length,
        adultCount: familyUnit.adultPersonIds.length,
      });
      return familyUnit;
    },
    async getFamilyUnitById(context, familyUnitId) {
      const familyUnit = await catalogRepository.getFamilyUnitById(
        context,
        familyUnitId,
      );
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "view",
        outcome: familyUnit === null ? "failed" : "succeeded",
        resourceType: "family_unit",
        resourceId: familyUnitId,
        metadata:
          familyUnit === null
            ? { found: false }
            : { found: true, caseId: familyUnit.caseId },
      });
      return familyUnit;
    },
    async createServicePlan(context, input) {
      const servicePlan = await catalogRepository.createServicePlan(
        context,
        input,
      );
      await recordCatalogCreate(
        context,
        "create",
        "service_plan",
        servicePlan,
        {
          caseId: servicePlan.caseId,
          goal: servicePlan.goal,
          status: servicePlan.status,
        },
      );
      return servicePlan;
    },
    async listServicePlansByCase(context, caseId) {
      const servicePlans = await catalogRepository.listServicePlansByCase(
        context,
        caseId,
      );
      await appendRepositoryAuditLog(relationalRepository, context, {
        action: "view",
        outcome: "succeeded",
        resourceType: "service_plan",
        resourceId: caseId,
        metadata: {
          lookup: "by_case",
          caseId,
          resultCount: servicePlans.length,
        },
      });
      return servicePlans;
    },
  };
}

export function createAuditedRepositories(
  options: CreateAuditedRepositoriesOptions,
): AuditedRepositories {
  return {
    caseRepository: createAuditedCaseRepository(
      options.relationalRepository,
      options.caseRepository,
    ),
    personRepository: createAuditedPersonRepository(
      options.relationalRepository,
      options.personRepository,
    ),
    catalogRepository: createAuditedCatalogRepository(
      options.relationalRepository,
      options.catalogRepository,
    ),
  };
}

export function createRelationalAuthAuditSink(
  options: CreateRelationalAuthAuditSinkOptions,
): { record(event: AuthAuditEventLike): Promise<void> } {
  return {
    async record(event): Promise<void> {
      const tenantId = event.tenantId ?? options.defaultTenantId;

      if (tenantId === undefined) {
        return;
      }

      const mapped = mapAuthAuditEvent(event);
      await options.relationalRepository.appendAuditLog(
        {
          tenantId,
          actorUserId:
            event.userId ??
            options.serviceActorUserId ??
            AUTH_SERVICE_ACTOR_USER_ID,
        },
        {
          actorUserId:
            event.userId ??
            options.serviceActorUserId ??
            AUTH_SERVICE_ACTOR_USER_ID,
          action: mapped.action,
          outcome: mapped.outcome,
          resourceType: mapped.resourceType,
          ...optionalStringProperty("resourceId", mapped.resourceId),
          ...optionalStringProperty("sourceIp", event.ipAddress),
          ...optionalStringProperty("userAgent", event.userAgent),
          occurredAt: event.occurredAt,
          metadata: normalizeAuditMetadata(mapped.metadata),
        },
      );
    },
  };
}

export function createRelationalAuthorizationAuditSink(
  options: CreateRelationalAuthorizationAuditSinkOptions,
): { record(event: AuthorizationAuditEvent): Promise<void> } {
  return {
    async record(event): Promise<void> {
      await options.relationalRepository.appendAuditLog(
        {
          tenantId: event.tenantId,
          actorUserId: event.actorUserId,
        },
        {
          actorUserId: event.actorUserId,
          action: mapAuthorizationAction(event.action),
          outcome: event.outcome,
          resourceType: event.resourceType,
          ...optionalStringProperty("resourceId", event.resourceId),
          ...optionalStringProperty("sourceIp", event.sourceIp),
          ...optionalStringProperty("userAgent", event.userAgent),
          ...optionalStringProperty("justification", event.justification),
          ...optionalStringProperty("requestId", event.requestId),
          ...optionalStringProperty("correlationId", event.correlationId),
          ...(event.occurredAt === undefined ? {} : { occurredAt: event.occurredAt }),
          metadata: normalizeAuditMetadata(event.metadata),
        },
      );
    },
  };
}

function mapAuthorizationAction(
  action: AuthorizationAuditEvent["action"],
): AuditLogAction {
  return action === "read" ? "view" : action;
}

function mapAuthAuditEvent(event: AuthAuditEventLike): {
  action: AuditLogAction;
  outcome: AuditLogOutcome;
  resourceType: string;
  resourceId?: string;
  metadata: AuditMetadata;
} {
  const sharedMetadata: AuditMetadata = {
    eventType: event.type,
    ...(event.email === undefined ? {} : { email: event.email }),
    ...(event.reason === undefined ? {} : { reason: event.reason }),
  };

  switch (event.type) {
    case "auth.login.succeeded":
      return {
        action: "login",
        outcome: "succeeded",
        resourceType: "auth_session",
        ...optionalStringProperty("resourceId", event.sessionId),
        metadata: sharedMetadata,
      };
    case "auth.login.failed":
      return {
        action: "login",
        outcome: "failed",
        resourceType: "auth_credentials",
        ...optionalStringProperty("resourceId", event.userId),
        metadata: sharedMetadata,
      };
    case "auth.login.mfa_required":
      return {
        action: "login",
        outcome: "denied",
        resourceType: "auth_mfa",
        ...optionalStringProperty("resourceId", event.userId),
        metadata: sharedMetadata,
      };
    case "auth.session.invalidated":
      return {
        action: "logout",
        outcome: "succeeded",
        resourceType: "auth_session",
        ...optionalStringProperty("resourceId", event.sessionId),
        metadata: sharedMetadata,
      };
    case "auth.mfa.enrollment.started":
    case "auth.mfa.enrollment.activated":
    case "auth.mfa.reset":
      return {
        action: "update",
        outcome: "succeeded",
        resourceType: "auth_mfa",
        ...optionalStringProperty("resourceId", event.userId),
        metadata: sharedMetadata,
      };
    case "auth.lockout.reset":
      return {
        action: "update",
        outcome: "succeeded",
        resourceType: "auth_lockout",
        ...optionalStringProperty("resourceId", event.userId),
        metadata: sharedMetadata,
      };
    case "auth.password.updated":
      return {
        action: "update",
        outcome: "succeeded",
        resourceType: "auth_password",
        ...optionalStringProperty("resourceId", event.userId),
        metadata: sharedMetadata,
      };
    case "auth.account.deactivated":
      return {
        action: "update",
        outcome: "succeeded",
        resourceType: "auth_account",
        ...optionalStringProperty("resourceId", event.userId),
        metadata: sharedMetadata,
      };
  }
}
