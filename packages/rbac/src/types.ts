export const ROLE_IDS = [
  "office-admin",
  "division-chief",
  "apa",
  "juvenile-apa",
  "victim-advocate",
  "legal-assistant",
  "read-only",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export const ACTIONS = ["create", "read", "update", "delete", "export"] as const;

export type Action = (typeof ACTIONS)[number];

export const RESOURCE_TYPES = [
  "criminal_case",
  "na_case",
  "person",
  "document",
  "evidence",
  "service_plan",
  "user",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const SENSITIVITY_TAGS = [
  "standard",
  "sensitive_case",
  "sealed_record",
] as const;

export type SensitivityTag = (typeof SENSITIVITY_TAGS)[number];

export const FIELD_IDS = ["ssn", "sealed_record", "victim_contact"] as const;

export type FieldId = (typeof FIELD_IDS)[number];

export type FieldAccessLevel = "allow" | "redact" | "deny";

export type AuthorizationMetadataValue = string | number | boolean | null;

export type AuthorizationMetadata = Record<string, AuthorizationMetadataValue>;

export interface PermissionCheckInput {
  actorUserId: string;
  tenantId: string;
  roleIds: readonly string[];
  action: Action;
  resourceType: ResourceType;
  resourceTenantId: string;
  resourceId?: string;
  sensitivityTag?: SensitivityTag;
  assignedUserIds?: readonly string[];
}

export interface PermissionDecision {
  allowed: boolean;
  reason: string;
  matchedRoleIds: RoleId[];
  requiresBreakGlass?: boolean;
}

export interface FieldAccessCheckInput extends PermissionCheckInput {
  action: Extract<Action, "read" | "update">;
  fieldId: FieldId;
}

export interface FieldPermissionDecision {
  access: FieldAccessLevel;
  canUpdate: boolean;
  reason: string;
  matchedRoleIds: RoleId[];
  requiresBreakGlass?: boolean;
}

export interface AuthorizationAuditEvent {
  tenantId: string;
  actorUserId: string;
  action: Action | "break_glass";
  outcome: "succeeded" | "denied";
  resourceType: ResourceType;
  resourceId?: string;
  metadata: AuthorizationMetadata;
  justification?: string;
  sourceIp?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  occurredAt?: string;
}

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as readonly string[]).includes(value);
}