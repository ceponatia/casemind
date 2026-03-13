import { BREAK_GLASS_ROLE_IDS } from "../roles/definitions.js";
import { getAllowedActionsForRole } from "../policies/permission-matrix.js";
import {
  isRoleId,
  type FieldAccessCheckInput,
  type FieldPermissionDecision,
  type PermissionCheckInput,
  type PermissionDecision,
  type RoleId,
} from "../types.js";

function normalizeRoleIds(roleIds: readonly string[]): RoleId[] {
  return [...new Set(roleIds.filter(isRoleId))];
}

function isBreakGlassEligible(roleIds: readonly RoleId[]): boolean {
  return roleIds.some((roleId) => BREAK_GLASS_ROLE_IDS.includes(roleId));
}

function isAssignedActor(input: PermissionCheckInput): boolean {
  return input.assignedUserIds?.includes(input.actorUserId) ?? false;
}

function buildDeniedDecision(
  reason: string,
  matchedRoleIds: RoleId[],
  requiresBreakGlass = false,
): PermissionDecision {
  return requiresBreakGlass
    ? { allowed: false, reason, matchedRoleIds, requiresBreakGlass: true }
    : { allowed: false, reason, matchedRoleIds };
}

export class AuthorizationError extends Error {
  public readonly decision: PermissionDecision;

  public constructor(decision: PermissionDecision) {
    super(decision.reason);
    this.name = "AuthorizationError";
    this.decision = decision;
  }
}

export function evaluatePermission(
  input: PermissionCheckInput,
): PermissionDecision {
  const matchedRoleIds = normalizeRoleIds(input.roleIds);

  if (input.tenantId !== input.resourceTenantId) {
    return buildDeniedDecision(
      "Cross-tenant access is denied by default.",
      matchedRoleIds,
    );
  }

  if (matchedRoleIds.length === 0) {
    return buildDeniedDecision(
      "No recognized role grants access to this resource.",
      matchedRoleIds,
    );
  }

  const allowedByMatrix = matchedRoleIds.some((roleId) =>
    getAllowedActionsForRole(roleId, input.resourceType).includes(input.action),
  );

  if (!allowedByMatrix) {
    return buildDeniedDecision(
      "The actor role does not grant this action for the resource type.",
      matchedRoleIds,
    );
  }

  if (
    input.sensitivityTag === "sealed_record" &&
    ["read", "update", "export"].includes(input.action)
  ) {
    return isBreakGlassEligible(matchedRoleIds)
      ? buildDeniedDecision(
          "Sealed records require break-glass access with justification.",
          matchedRoleIds,
          true,
        )
      : buildDeniedDecision(
          "Sealed records are not available to this role.",
          matchedRoleIds,
        );
  }

  if (
    input.sensitivityTag === "sensitive_case" &&
    input.action !== "create" &&
    !isAssignedActor(input)
  ) {
    return isBreakGlassEligible(matchedRoleIds)
      ? buildDeniedDecision(
          "Sensitive case access requires assignment or break-glass justification.",
          matchedRoleIds,
          true,
        )
      : buildDeniedDecision(
          "Sensitive case access is limited to explicitly assigned users.",
          matchedRoleIds,
        );
  }

  return {
    allowed: true,
    reason: "Access granted by the policy matrix.",
    matchedRoleIds,
  };
}

function buildFieldDecision(
  access: FieldPermissionDecision["access"],
  canUpdate: boolean,
  reason: string,
  matchedRoleIds: RoleId[],
  requiresBreakGlass = false,
): FieldPermissionDecision {
  return requiresBreakGlass
    ? { access, canUpdate, reason, matchedRoleIds, requiresBreakGlass: true }
    : { access, canUpdate, reason, matchedRoleIds };
}

export function evaluateFieldAccess(
  input: FieldAccessCheckInput,
): FieldPermissionDecision {
  const baseDecision = evaluatePermission(input);

  if (!baseDecision.allowed) {
    return buildFieldDecision(
      "deny",
      false,
      baseDecision.reason,
      baseDecision.matchedRoleIds,
      baseDecision.requiresBreakGlass ?? false,
    );
  }

  const matchedRoleIds = baseDecision.matchedRoleIds;
  const isAdmin = matchedRoleIds.some(
    (roleId) => roleId === "office-admin" || roleId === "division-chief",
  );
  const isProsecutor = matchedRoleIds.some(
    (roleId) => roleId === "apa" || roleId === "juvenile-apa",
  );
  const isLegalAssistant = matchedRoleIds.includes("legal-assistant");
  const isVictimAdvocate = matchedRoleIds.includes("victim-advocate");

  if (input.fieldId === "sealed_record") {
    return isBreakGlassEligible(matchedRoleIds)
      ? buildFieldDecision(
          "deny",
          false,
          "Sealed record fields require break-glass access.",
          matchedRoleIds,
          true,
        )
      : buildFieldDecision(
          "deny",
          false,
          "Sealed record fields are not visible to this role.",
          matchedRoleIds,
        );
  }

  if (input.fieldId === "ssn") {
    if (isAdmin) {
      return buildFieldDecision(
        "allow",
        input.action === "update",
        "SSN access granted to administrative roles.",
        matchedRoleIds,
      );
    }

    if (isProsecutor) {
      return buildFieldDecision(
        "allow",
        false,
        "SSN access is read-only for prosecutor roles.",
        matchedRoleIds,
      );
    }

    if (isLegalAssistant) {
      return buildFieldDecision(
        "redact",
        false,
        "SSN values are redacted for legal assistants.",
        matchedRoleIds,
      );
    }

    return buildFieldDecision(
      isVictimAdvocate ? "deny" : "redact",
      false,
      "SSN values are not available to this role.",
      matchedRoleIds,
    );
  }

  if (input.fieldId === "victim_contact") {
    if (isAdmin || isProsecutor || isLegalAssistant) {
      return buildFieldDecision(
        "allow",
        input.action === "update",
        "Victim contact data is available to operational roles.",
        matchedRoleIds,
      );
    }

    if (isVictimAdvocate) {
      return buildFieldDecision(
        "allow",
        false,
        "Victim advocates can view victim contact data.",
        matchedRoleIds,
      );
    }

    return buildFieldDecision(
      "redact",
      false,
      "Victim contact data is redacted for read-only access.",
      matchedRoleIds,
    );
  }

  return buildFieldDecision(
    "deny",
    false,
    "Unknown field protection rule.",
    matchedRoleIds,
  );
}

export function authorizeOrThrow(input: PermissionCheckInput): PermissionDecision {
  const decision = evaluatePermission(input);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function withAuthorization<T>(
  input: PermissionCheckInput,
  operation: () => Promise<T> | T,
): Promise<T> {
  authorizeOrThrow(input);
  return operation();
}