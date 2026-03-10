import type {
  AiInteractionPlaceholder,
  AuditLogEntry,
  CalendarEvent,
  CaseStatusCount,
  CriminalCase,
  DocumentRecord,
  EvidenceRecord,
  FamilyUnit,
  NACase,
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
  NotificationRecord,
  Person,
  ServicePlan,
  TenantRecord,
  UserRecord,
} from "./types.js";

export interface RepositoryContext {
  tenantId: string;
  actorUserId: string;
}

export interface CaseRepository {
  createCriminalCase(
    context: RepositoryContext,
    input: NewCriminalCase,
  ): Promise<CriminalCase>;
  getCriminalCaseById(
    context: RepositoryContext,
    caseId: string,
  ): Promise<CriminalCase | null>;
  updateCriminalCase(
    context: RepositoryContext,
    caseId: string,
    patch: Partial<NewCriminalCase>,
  ): Promise<CriminalCase>;
  listCriminalCases(context: RepositoryContext): Promise<CriminalCase[]>;
  summarizeCriminalCaseStatuses(
    context: RepositoryContext,
  ): Promise<CaseStatusCount[]>;
  createNACase(context: RepositoryContext, input: NewNACase): Promise<NACase>;
  getNACaseById(
    context: RepositoryContext,
    caseId: string,
  ): Promise<NACase | null>;
  updateNACase(
    context: RepositoryContext,
    caseId: string,
    patch: Partial<NewNACase>,
  ): Promise<NACase>;
  listNACases(context: RepositoryContext): Promise<NACase[]>;
}

export interface PersonRepository {
  createPerson(context: RepositoryContext, input: NewPerson): Promise<Person>;
  getPersonById(
    context: RepositoryContext,
    personId: string,
  ): Promise<Person | null>;
  listPeopleByIds(
    context: RepositoryContext,
    personIds: string[],
  ): Promise<Person[]>;
}

export interface CatalogRepository {
  createDocument(
    context: RepositoryContext,
    input: NewDocumentRecord,
  ): Promise<DocumentRecord>;
  listDocumentsByCase(
    context: RepositoryContext,
    caseId: string,
  ): Promise<DocumentRecord[]>;
  createEvidence(
    context: RepositoryContext,
    input: NewEvidenceRecord,
  ): Promise<EvidenceRecord>;
  listEvidenceByCase(
    context: RepositoryContext,
    caseId: string,
  ): Promise<EvidenceRecord[]>;
  createFamilyUnit(
    context: RepositoryContext,
    input: NewFamilyUnit,
  ): Promise<FamilyUnit>;
  getFamilyUnitById(
    context: RepositoryContext,
    familyUnitId: string,
  ): Promise<FamilyUnit | null>;
  createServicePlan(
    context: RepositoryContext,
    input: NewServicePlan,
  ): Promise<ServicePlan>;
  listServicePlansByCase(
    context: RepositoryContext,
    caseId: string,
  ): Promise<ServicePlan[]>;
}

export interface RelationalRepository {
  createTenant(
    context: RepositoryContext,
    input: NewTenantRecord,
  ): Promise<TenantRecord>;
  getTenant(context: RepositoryContext): Promise<TenantRecord | null>;
  createUser(
    context: RepositoryContext,
    input: NewUserRecord,
  ): Promise<UserRecord>;
  listUsers(context: RepositoryContext): Promise<UserRecord[]>;
  appendAuditLog(
    context: RepositoryContext,
    input: NewAuditLogEntry,
  ): Promise<AuditLogEntry>;
  listAuditLogEntries(context: RepositoryContext): Promise<AuditLogEntry[]>;
  createCalendarEvent(
    context: RepositoryContext,
    input: NewCalendarEvent,
  ): Promise<CalendarEvent>;
  listCalendarEvents(context: RepositoryContext): Promise<CalendarEvent[]>;
  createNotification(
    context: RepositoryContext,
    input: NewNotificationRecord,
  ): Promise<NotificationRecord>;
  listNotifications(context: RepositoryContext): Promise<NotificationRecord[]>;
  createAiInteractionPlaceholder(
    context: RepositoryContext,
    input: NewAiInteractionPlaceholder,
  ): Promise<AiInteractionPlaceholder>;
  listAiInteractionPlaceholders(
    context: RepositoryContext,
  ): Promise<AiInteractionPlaceholder[]>;
}
