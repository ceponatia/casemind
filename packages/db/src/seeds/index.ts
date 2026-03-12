import type {
  CatalogRepository,
  CaseRepository,
  PersonRepository,
  RelationalRepository,
  RepositoryContext,
} from "../contracts.js";
import type {
  NewAiInteractionPlaceholder,
  NewAuditLogEntry,
  NewCalendarEvent,
  NewCriminalCase,
  NewDocumentRecord,
  NewEvidenceRecord,
  NewFamilyUnit,
  NewNACase,
  NewNotificationRecord,
  NewPerson,
  NewServicePlan,
  NewTenantRecord,
  NewUserRecord,
} from "../types.js";

export interface DeterministicSeedSet {
  context: RepositoryContext;
  tenant: NewTenantRecord & { id: string };
  users: NewUserRecord[];
  people: NewPerson[];
  criminalCases: NewCriminalCase[];
  naCases: NewNACase[];
  documents: NewDocumentRecord[];
  evidence: NewEvidenceRecord[];
  familyUnits: NewFamilyUnit[];
  servicePlans: NewServicePlan[];
  auditLogEntries: NewAuditLogEntry[];
  calendarEvents: NewCalendarEvent[];
  notifications: NewNotificationRecord[];
  aiInteractions: NewAiInteractionPlaceholder[];
}

const DEFAULT_TENANT_ID = "tenant-local-demo";
const DEFAULT_ACTOR_USER_ID = "user-office-admin";

export function createDeterministicSeedSet(
  options: {
    tenantId?: string;
    actorUserId?: string;
  } = {},
): DeterministicSeedSet {
  const tenantId =
    options.tenantId ??
    process.env.CASEMIND_AUTH_SYNTHETIC_TENANT_ID ??
    DEFAULT_TENANT_ID;
  const actorUserId = options.actorUserId ?? DEFAULT_ACTOR_USER_ID;
  const familyUnitId = "family-unit-001";
  const servicePlanId = "service-plan-001";
  const criminalCaseId = "criminal-case-001";
  const naCaseId = "na-case-001";

  return {
    context: {
      tenantId,
      actorUserId,
    },
    tenant: {
      id: tenantId,
      slug: "macomb-demo",
      displayName: "Macomb Demo Office",
    },
    users: [
      {
        id: actorUserId,
        email: "office.admin@casemind.local",
        displayName: "Office Admin",
        role: "office-admin",
        authProvider: "credentials",
      },
      {
        id: "user-apa-001",
        email: "apa@casemind.local",
        displayName: "Assigned APA",
        role: "apa",
        authProvider: "credentials",
      },
      {
        id: "user-juvenile-001",
        email: "juvenile.apa@casemind.local",
        displayName: "Juvenile Division APA",
        role: "juvenile-division-apa",
        authProvider: "credentials",
      },
    ],
    people: [
      {
        id: "person-defendant-001",
        firstName: "Jordan",
        lastName: "Parker",
        dateOfBirth: "1988-04-11",
        roleTags: ["defendant"],
        externalIdentifiers: ["SID-1001"],
      },
      {
        id: "person-victim-001",
        firstName: "Casey",
        lastName: "Nguyen",
        dateOfBirth: "1992-02-01",
        roleTags: ["victim"],
        externalIdentifiers: ["VICTIM-44"],
      },
      {
        id: "person-child-001",
        firstName: "Avery",
        lastName: "Thomas",
        dateOfBirth: "2016-07-19",
        roleTags: ["child"],
        externalIdentifiers: ["CHILD-99"],
      },
      {
        id: "person-respondent-001",
        firstName: "Morgan",
        lastName: "Thomas",
        dateOfBirth: "1985-10-30",
        roleTags: ["respondent"],
        externalIdentifiers: ["RESP-71"],
      },
    ],
    criminalCases: [
      {
        id: criminalCaseId,
        caseNumber: "2026-CR-1001",
        status: "screening",
        court: "Macomb County Circuit",
        filedAt: "2026-03-01T13:00:00.000Z",
        defendantPersonIds: ["person-defendant-001"],
        victimPersonIds: ["person-victim-001"],
        chargeIds: ["charge-001", "charge-002"],
      },
      {
        id: "criminal-case-002",
        caseNumber: "2026-CR-1002",
        status: "arraigned",
        court: "Macomb County District",
        filedAt: "2026-03-02T13:00:00.000Z",
        defendantPersonIds: ["person-defendant-001"],
        victimPersonIds: ["person-victim-001"],
        chargeIds: ["charge-003"],
      },
    ],
    naCases: [
      {
        id: naCaseId,
        petitionNumber: "2026-NA-2001",
        status: "petition-filed",
        childPersonIds: ["person-child-001"],
        respondentPersonIds: ["person-respondent-001"],
        familyUnitId,
        servicePlanIds: [servicePlanId],
      },
    ],
    documents: [
      {
        id: "document-001",
        caseId: criminalCaseId,
        title: "Charging Packet",
        documentType: "charging-packet",
        storageKey: "documents/charging-packet-001.pdf",
        classification: "cji",
        textContent: "Synthetic charging packet for local development.",
      },
      {
        id: "document-002",
        caseId: naCaseId,
        title: "Initial Petition",
        documentType: "petition",
        storageKey: "documents/initial-petition-001.pdf",
        classification: "sensitive",
        textContent: "Synthetic neglect and abuse petition.",
      },
    ],
    evidence: [
      {
        id: "evidence-001",
        caseId: criminalCaseId,
        evidenceNumber: "EV-1001",
        documentIds: ["document-001"],
        chainOfCustody: [
          "Booked by arresting officer",
          "Transferred to property room",
        ],
        description: "Body-worn camera export",
      },
    ],
    familyUnits: [
      {
        id: familyUnitId,
        caseId: naCaseId,
        childPersonIds: ["person-child-001"],
        adultPersonIds: ["person-respondent-001"],
        address: "123 Local Demo Ave, Mt Clemens, MI",
      },
    ],
    servicePlans: [
      {
        id: servicePlanId,
        caseId: naCaseId,
        goal: "Stabilize home environment",
        status: "active",
        taskIds: ["task-001", "task-002"],
      },
    ],
    auditLogEntries: [
      {
        id: "audit-001",
        actorUserId,
        action: "create",
        outcome: "succeeded",
        resourceType: "tenant_seed",
        resourceId: tenantId,
        metadata: {
          source: "ph03-seed",
          mode: "deterministic",
        },
        sourceIp: "127.0.0.1",
        occurredAt: "2026-03-10T12:00:00.000Z",
      },
    ],
    calendarEvents: [
      {
        id: "calendar-001",
        caseId: criminalCaseId,
        title: "Probable Cause Conference",
        startsAt: "2026-03-12T14:00:00.000Z",
        endsAt: "2026-03-12T14:30:00.000Z",
      },
    ],
    notifications: [
      {
        id: "notification-001",
        userId: actorUserId,
        title: "Seed data ready",
        body: "The PH03 deterministic seed has been loaded.",
        severity: "info",
      },
    ],
    aiInteractions: [
      {
        id: "ai-001",
        purpose: "future-summary-placeholder",
        status: "pending",
        modelName: "deferred",
        promptTemplateId: "ph03-placeholder",
        metadata: {
          caseType: "criminal",
        },
        requestedAt: "2026-03-10T12:05:00.000Z",
      },
    ],
  };
}

export async function seedDeterministicLocalData(
  repositories: {
    relationalRepository: RelationalRepository;
    caseRepository: CaseRepository;
    personRepository: PersonRepository;
    catalogRepository: CatalogRepository;
  },
  seedSet: DeterministicSeedSet = createDeterministicSeedSet(),
): Promise<void> {
  const { context } = seedSet;

  await repositories.relationalRepository.createTenant(context, seedSet.tenant);

  for (const user of seedSet.users) {
    await repositories.relationalRepository.createUser(context, user);
  }

  for (const person of seedSet.people) {
    await repositories.personRepository.createPerson(context, person);
  }

  for (const criminalCase of seedSet.criminalCases) {
    await repositories.caseRepository.createCriminalCase(context, criminalCase);
  }

  for (const naCase of seedSet.naCases) {
    await repositories.caseRepository.createNACase(context, naCase);
  }

  for (const document of seedSet.documents) {
    await repositories.catalogRepository.createDocument(context, document);
  }

  for (const evidenceRecord of seedSet.evidence) {
    await repositories.catalogRepository.createEvidence(
      context,
      evidenceRecord,
    );
  }

  for (const familyUnit of seedSet.familyUnits) {
    await repositories.catalogRepository.createFamilyUnit(context, familyUnit);
  }

  for (const servicePlan of seedSet.servicePlans) {
    await repositories.catalogRepository.createServicePlan(
      context,
      servicePlan,
    );
  }

  for (const auditLog of seedSet.auditLogEntries) {
    await repositories.relationalRepository.appendAuditLog(context, auditLog);
  }

  for (const calendarEvent of seedSet.calendarEvents) {
    await repositories.relationalRepository.createCalendarEvent(
      context,
      calendarEvent,
    );
  }

  for (const notification of seedSet.notifications) {
    await repositories.relationalRepository.createNotification(
      context,
      notification,
    );
  }

  for (const aiInteraction of seedSet.aiInteractions) {
    await repositories.relationalRepository.createAiInteractionPlaceholder(
      context,
      aiInteraction,
    );
  }
}
