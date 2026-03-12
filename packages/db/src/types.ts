export interface TenantScopedRecord {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantRecord {
  id: string;
  slug: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CriminalCase extends TenantScopedRecord {
  caseNumber: string;
  status: string;
  court: string;
  filedAt?: string;
  defendantPersonIds: string[];
  victimPersonIds: string[];
  chargeIds: string[];
}

export interface NACase extends TenantScopedRecord {
  petitionNumber: string;
  status: string;
  childPersonIds: string[];
  respondentPersonIds: string[];
  familyUnitId?: string;
  servicePlanIds: string[];
}

export interface Person extends TenantScopedRecord {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  roleTags: string[];
  externalIdentifiers: string[];
}

export interface DocumentRecord extends TenantScopedRecord {
  caseId: string;
  title: string;
  documentType: string;
  storageKey: string;
  classification: string;
  textContent?: string;
}

export interface EvidenceRecord extends TenantScopedRecord {
  caseId: string;
  evidenceNumber: string;
  documentIds: string[];
  chainOfCustody: string[];
  description: string;
}

export interface FamilyUnit extends TenantScopedRecord {
  caseId: string;
  childPersonIds: string[];
  adultPersonIds: string[];
  address: string;
}

export interface ServicePlan extends TenantScopedRecord {
  caseId: string;
  goal: string;
  status: string;
  taskIds: string[];
}

export interface UserRecord extends TenantScopedRecord {
  email: string;
  displayName: string;
  role: string;
  authProvider: string;
}

export interface AuditLogEntry extends TenantScopedRecord {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: Record<string, string>;
  sourceIp?: string;
  occurredAt: string;
}

export interface CalendarEvent extends TenantScopedRecord {
  caseId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
}

export interface NotificationRecord extends TenantScopedRecord {
  userId: string;
  title: string;
  body: string;
  severity: string;
  readAt?: string;
}

export interface AiInteractionPlaceholder extends TenantScopedRecord {
  purpose: string;
  status: string;
  modelName?: string;
  promptTemplateId?: string;
  metadata: Record<string, string>;
  requestedAt: string;
}

export interface NewTenantRecord {
  id?: string;
  slug: string;
  displayName: string;
}

export interface NewCriminalCase {
  id?: string;
  caseNumber: string;
  status: string;
  court: string;
  filedAt?: string;
  defendantPersonIds: string[];
  victimPersonIds: string[];
  chargeIds: string[];
}

export interface NewNACase {
  id?: string;
  petitionNumber: string;
  status: string;
  childPersonIds: string[];
  respondentPersonIds: string[];
  familyUnitId?: string;
  servicePlanIds: string[];
}

export interface NewPerson {
  id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  roleTags: string[];
  externalIdentifiers: string[];
}

export interface NewDocumentRecord {
  id?: string;
  caseId: string;
  title: string;
  documentType: string;
  storageKey: string;
  classification: string;
  textContent?: string;
}

export interface NewEvidenceRecord {
  id?: string;
  caseId: string;
  evidenceNumber: string;
  documentIds: string[];
  chainOfCustody: string[];
  description: string;
}

export interface NewFamilyUnit {
  id?: string;
  caseId: string;
  childPersonIds: string[];
  adultPersonIds: string[];
  address: string;
}

export interface NewServicePlan {
  id?: string;
  caseId: string;
  goal: string;
  status: string;
  taskIds: string[];
}

export interface NewUserRecord {
  id?: string;
  email: string;
  displayName: string;
  role: string;
  authProvider: string;
}

export interface NewAuditLogEntry {
  id?: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: Record<string, string>;
  sourceIp?: string;
  occurredAt?: string;
}

export interface NewCalendarEvent {
  id?: string;
  caseId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
}

export interface NewNotificationRecord {
  id?: string;
  userId: string;
  title: string;
  body: string;
  severity: string;
  readAt?: string;
}

export interface NewAiInteractionPlaceholder {
  id?: string;
  purpose: string;
  status: string;
  modelName?: string;
  promptTemplateId?: string;
  metadata: Record<string, string>;
  requestedAt?: string;
}

export interface CaseStatusCount {
  status: string;
  count: number;
}
