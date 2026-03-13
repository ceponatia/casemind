import type {
  CatalogRepository,
  CaseRepository,
  PersonRepository,
  RelationalRepository,
  RepositoryContext,
} from "../contracts.js";
import {
  ROLE_IDS,
  type RoleId,
} from "@casemind/rbac";
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
const SECONDARY_TENANT_ID = "tenant-local-secondary";

const [
  OFFICE_ADMIN_ROLE_ID,
  DIVISION_CHIEF_ROLE_ID,
  APA_ROLE_ID,
  JUVENILE_APA_ROLE_ID,
  VICTIM_ADVOCATE_ROLE_ID,
  LEGAL_ASSISTANT_ROLE_ID,
  READ_ONLY_ROLE_ID,
] = ROLE_IDS satisfies readonly RoleId[];

function withOptionalSuffix(value: string, suffix: string): string {
  return suffix.length === 0 ? value : `${value}-${suffix}`;
}

export function createDeterministicSeedSet(
  options: {
    tenantId?: string;
    actorUserId?: string;
    idSuffix?: string;
    slug?: string;
    displayName?: string;
  } = {},
): DeterministicSeedSet {
  const tenantId =
    options.tenantId ??
    process.env.CASEMIND_AUTH_SYNTHETIC_TENANT_ID ??
    DEFAULT_TENANT_ID;
  const actorUserId = options.actorUserId ?? DEFAULT_ACTOR_USER_ID;
  const idSuffix = options.idSuffix ?? "";
  const familyUnitId = withOptionalSuffix("family-unit-001", idSuffix);
  const servicePlanId = withOptionalSuffix("service-plan-001", idSuffix);
  const criminalCaseId = withOptionalSuffix("criminal-case-001", idSuffix);
  const criminalCaseTwoId = withOptionalSuffix("criminal-case-002", idSuffix);
  const naCaseId = withOptionalSuffix("na-case-001", idSuffix);
  const defendantPersonId = withOptionalSuffix("person-defendant-001", idSuffix);
  const victimPersonId = withOptionalSuffix("person-victim-001", idSuffix);
  const childPersonId = withOptionalSuffix("person-child-001", idSuffix);
  const respondentPersonId = withOptionalSuffix("person-respondent-001", idSuffix);

  return {
    context: {
      tenantId,
      actorUserId,
    },
    tenant: {
      id: tenantId,
      slug: options.slug ?? (tenantId === DEFAULT_TENANT_ID ? "macomb-demo" : "wayne-demo"),
      displayName:
        options.displayName ??
        (tenantId === DEFAULT_TENANT_ID ? "Macomb Demo Office" : "Wayne Demo Office"),
    },
    users: [
      {
        id: actorUserId,
        email: "office.admin@casemind.local",
        displayName: "Office Admin",
        roleIds: [OFFICE_ADMIN_ROLE_ID],
        authProvider: "credentials",
      },
      {
        id: withOptionalSuffix("user-division-chief-001", idSuffix),
        email: "division.chief@casemind.local",
        displayName: "Division Chief",
        roleIds: [DIVISION_CHIEF_ROLE_ID],
        authProvider: "credentials",
      },
      {
        id: withOptionalSuffix("user-apa-001", idSuffix),
        email: "apa@casemind.local",
        displayName: "Assigned APA",
        roleIds: [APA_ROLE_ID],
        authProvider: "credentials",
      },
      {
        id: withOptionalSuffix("user-juvenile-001", idSuffix),
        email: "juvenile.apa@casemind.local",
        displayName: "Juvenile Division APA",
        roleIds: [JUVENILE_APA_ROLE_ID],
        authProvider: "credentials",
      },
      {
        id: withOptionalSuffix("user-victim-advocate-001", idSuffix),
        email: "victim.advocate@casemind.local",
        displayName: "Victim Advocate",
        roleIds: [VICTIM_ADVOCATE_ROLE_ID],
        authProvider: "credentials",
      },
      {
        id: withOptionalSuffix("user-legal-assistant-001", idSuffix),
        email: "legal.assistant@casemind.local",
        displayName: "Legal Assistant",
        roleIds: [LEGAL_ASSISTANT_ROLE_ID],
        authProvider: "credentials",
      },
      {
        id: withOptionalSuffix("user-read-only-001", idSuffix),
        email: "read.only@casemind.local",
        displayName: "Read-Only User",
        roleIds: [READ_ONLY_ROLE_ID],
        authProvider: "credentials",
      },
    ],
    people: [
      {
        id: defendantPersonId,
        firstName: "Jordan",
        lastName: "Parker",
        dateOfBirth: "1988-04-11",
        roleTags: ["defendant"],
        externalIdentifiers: ["SID-1001"],
      },
      {
        id: victimPersonId,
        firstName: "Casey",
        lastName: "Nguyen",
        dateOfBirth: "1992-02-01",
        roleTags: ["victim"],
        externalIdentifiers: ["VICTIM-44"],
      },
      {
        id: childPersonId,
        firstName: "Avery",
        lastName: "Thomas",
        dateOfBirth: "2016-07-19",
        roleTags: ["child"],
        externalIdentifiers: ["CHILD-99"],
      },
      {
        id: respondentPersonId,
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
        defendantPersonIds: [defendantPersonId],
        victimPersonIds: [victimPersonId],
        chargeIds: ["charge-001", "charge-002"],
      },
      {
        id: criminalCaseTwoId,
        caseNumber: "2026-CR-1002",
        status: "arraigned",
        court: "Macomb County District",
        filedAt: "2026-03-02T13:00:00.000Z",
        defendantPersonIds: [defendantPersonId],
        victimPersonIds: [victimPersonId],
        chargeIds: ["charge-003"],
      },
    ],
    naCases: [
      {
        id: naCaseId,
        petitionNumber: "2026-NA-2001",
        status: "petition-filed",
        childPersonIds: [childPersonId],
        respondentPersonIds: [respondentPersonId],
        familyUnitId,
        servicePlanIds: [servicePlanId],
      },
    ],
    documents: [
      {
        id: withOptionalSuffix("document-001", idSuffix),
        caseId: criminalCaseId,
        title: "Charging Packet",
        documentType: "charging-packet",
        storageKey: "documents/charging-packet-001.pdf",
        classification: "cji",
        textContent: "Synthetic charging packet for local development.",
      },
      {
        id: withOptionalSuffix("document-002", idSuffix),
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
        id: withOptionalSuffix("evidence-001", idSuffix),
        caseId: criminalCaseId,
        evidenceNumber: "EV-1001",
        documentIds: [withOptionalSuffix("document-001", idSuffix)],
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
        childPersonIds: [childPersonId],
        adultPersonIds: [respondentPersonId],
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
        id: withOptionalSuffix("audit-001", idSuffix),
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
        id: withOptionalSuffix("calendar-001", idSuffix),
        caseId: criminalCaseId,
        title: "Probable Cause Conference",
        startsAt: "2026-03-12T14:00:00.000Z",
        endsAt: "2026-03-12T14:30:00.000Z",
      },
    ],
    notifications: [
      {
        id: withOptionalSuffix("notification-001", idSuffix),
        userId: actorUserId,
        title: "Seed data ready",
        body: "The PH03 deterministic seed has been loaded.",
        severity: "info",
      },
    ],
    aiInteractions: [
      {
        id: withOptionalSuffix("ai-001", idSuffix),
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

export function createLocalDevelopmentSeedSets(): DeterministicSeedSet[] {
  return [
    createDeterministicSeedSet(),
    createDeterministicSeedSet({
      tenantId: SECONDARY_TENANT_ID,
      actorUserId: "user-office-admin-secondary",
      idSuffix: "secondary",
      slug: "wayne-demo",
      displayName: "Wayne Demo Office",
    }),
  ];
}

export async function seedDeterministicLocalData(
  repositories: {
    relationalRepository: RelationalRepository;
    caseRepository: CaseRepository;
    personRepository: PersonRepository;
    catalogRepository: CatalogRepository;
  },
  seedSets: DeterministicSeedSet[] = createLocalDevelopmentSeedSets(),
): Promise<void> {
  for (const seedSet of seedSets) {
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
}
