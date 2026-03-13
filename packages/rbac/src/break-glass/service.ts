import { BREAK_GLASS_ROLE_IDS } from "../roles/definitions.js";
import { evaluatePermission } from "../enforcement/policy-evaluator.js";
import type {
  AuthorizationAuditEvent,
  PermissionCheckInput,
  PermissionDecision,
  RoleId,
} from "../types.js";

export const MIN_BREAK_GLASS_JUSTIFICATION_LENGTH = 20;

export interface AuthorizationAuditSink {
  record(event: AuthorizationAuditEvent): void | Promise<void>;
}

export interface BreakGlassAccessInput extends PermissionCheckInput {
  justification: string;
  sourceIp?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  occurredAt?: string;
}

export interface BreakGlassAuthorizationResult {
  allowed: boolean;
  reason: string;
  wasBreakGlass: boolean;
  matchedRoleIds: RoleId[];
  auditEvent?: AuthorizationAuditEvent;
}

function hasBreakGlassRole(roleIds: readonly RoleId[]): boolean {
  return roleIds.some((roleId) => BREAK_GLASS_ROLE_IDS.includes(roleId));
}

export function validateBreakGlassJustification(justification: string): void {
  if (justification.trim().length < MIN_BREAK_GLASS_JUSTIFICATION_LENGTH) {
    throw new Error(
      `Break-glass justification must be at least ${MIN_BREAK_GLASS_JUSTIFICATION_LENGTH} characters.`,
    );
  }
}

function createBreakGlassAuditEvent(
  input: BreakGlassAccessInput,
  decision: PermissionDecision,
  outcome: AuthorizationAuditEvent["outcome"],
): AuthorizationAuditEvent {
  return {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "break_glass",
    outcome,
    resourceType: input.resourceType,
    ...(input.resourceId === undefined ? {} : { resourceId: input.resourceId }),
    metadata: {
      originalAction: input.action,
      sensitivityTag: input.sensitivityTag ?? "standard",
      matchedRoles: decision.matchedRoleIds.join(","),
      assignedUserCount: input.assignedUserIds?.length ?? 0,
    },
    justification: input.justification.trim(),
    ...(input.sourceIp === undefined ? {} : { sourceIp: input.sourceIp }),
    ...(input.userAgent === undefined ? {} : { userAgent: input.userAgent }),
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.correlationId === undefined
      ? {}
      : { correlationId: input.correlationId }),
    ...(input.occurredAt === undefined ? {} : { occurredAt: input.occurredAt }),
  };
}

export async function authorizeBreakGlassAccess(
  input: BreakGlassAccessInput,
  options: {
    auditSink?: AuthorizationAuditSink;
  } = {},
): Promise<BreakGlassAuthorizationResult> {
  const decision = evaluatePermission(input);

  if (decision.allowed) {
    return {
      allowed: true,
      reason: decision.reason,
      wasBreakGlass: false,
      matchedRoleIds: decision.matchedRoleIds,
    };
  }

  if (!decision.requiresBreakGlass || !hasBreakGlassRole(decision.matchedRoleIds)) {
    return {
      allowed: false,
      reason: decision.reason,
      wasBreakGlass: false,
      matchedRoleIds: decision.matchedRoleIds,
    };
  }

  validateBreakGlassJustification(input.justification);

  const auditEvent = createBreakGlassAuditEvent(input, decision, "succeeded");

  if (options.auditSink !== undefined) {
    await options.auditSink.record(auditEvent);
  }

  return {
    allowed: true,
    reason: "Break-glass access granted with justification.",
    wasBreakGlass: true,
    matchedRoleIds: decision.matchedRoleIds,
    auditEvent,
  };
}

export async function withBreakGlassAuthorization<T>(
  input: BreakGlassAccessInput,
  operation: () => Promise<T> | T,
  options: {
    auditSink?: AuthorizationAuditSink;
  } = {},
): Promise<T> {
  const result = await authorizeBreakGlassAccess(input, options);

  if (!result.allowed) {
    throw new Error(result.reason);
  }

  return operation();
}