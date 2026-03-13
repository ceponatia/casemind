import type { Action, ResourceType, RoleId } from "../types.js";

export type PermissionMatrix = Record<RoleId, Record<ResourceType, readonly Action[]>>;

const NO_ACTIONS: readonly Action[] = [];
const READ_ONLY_ACTIONS = ["read"] as const;
const READ_WRITE_ACTIONS = ["create", "read", "update"] as const;
const CASE_MANAGEMENT_ACTIONS = ["create", "read", "update", "export"] as const;
const FULL_RESOURCE_ACTIONS = ["create", "read", "update", "delete", "export"] as const;

export const PERMISSION_MATRIX: PermissionMatrix = {
  "office-admin": {
    criminal_case: FULL_RESOURCE_ACTIONS,
    na_case: FULL_RESOURCE_ACTIONS,
    person: FULL_RESOURCE_ACTIONS,
    document: FULL_RESOURCE_ACTIONS,
    evidence: FULL_RESOURCE_ACTIONS,
    service_plan: FULL_RESOURCE_ACTIONS,
    user: FULL_RESOURCE_ACTIONS,
  },
  "division-chief": {
    criminal_case: CASE_MANAGEMENT_ACTIONS,
    na_case: CASE_MANAGEMENT_ACTIONS,
    person: CASE_MANAGEMENT_ACTIONS,
    document: CASE_MANAGEMENT_ACTIONS,
    evidence: CASE_MANAGEMENT_ACTIONS,
    service_plan: CASE_MANAGEMENT_ACTIONS,
    user: READ_ONLY_ACTIONS,
  },
  apa: {
    criminal_case: CASE_MANAGEMENT_ACTIONS,
    na_case: NO_ACTIONS,
    person: READ_WRITE_ACTIONS,
    document: CASE_MANAGEMENT_ACTIONS,
    evidence: CASE_MANAGEMENT_ACTIONS,
    service_plan: NO_ACTIONS,
    user: NO_ACTIONS,
  },
  "juvenile-apa": {
    criminal_case: NO_ACTIONS,
    na_case: CASE_MANAGEMENT_ACTIONS,
    person: READ_WRITE_ACTIONS,
    document: CASE_MANAGEMENT_ACTIONS,
    evidence: NO_ACTIONS,
    service_plan: CASE_MANAGEMENT_ACTIONS,
    user: NO_ACTIONS,
  },
  "victim-advocate": {
    criminal_case: READ_ONLY_ACTIONS,
    na_case: NO_ACTIONS,
    person: READ_ONLY_ACTIONS,
    document: READ_ONLY_ACTIONS,
    evidence: NO_ACTIONS,
    service_plan: NO_ACTIONS,
    user: NO_ACTIONS,
  },
  "legal-assistant": {
    criminal_case: READ_WRITE_ACTIONS,
    na_case: READ_WRITE_ACTIONS,
    person: READ_WRITE_ACTIONS,
    document: READ_WRITE_ACTIONS,
    evidence: READ_WRITE_ACTIONS,
    service_plan: READ_WRITE_ACTIONS,
    user: NO_ACTIONS,
  },
  "read-only": {
    criminal_case: READ_ONLY_ACTIONS,
    na_case: READ_ONLY_ACTIONS,
    person: READ_ONLY_ACTIONS,
    document: READ_ONLY_ACTIONS,
    evidence: READ_ONLY_ACTIONS,
    service_plan: READ_ONLY_ACTIONS,
    user: NO_ACTIONS,
  },
};

export function getAllowedActionsForRole(
  roleId: RoleId,
  resourceType: ResourceType,
): readonly Action[] {
  return PERMISSION_MATRIX[roleId][resourceType];
}