import { randomBytes, randomUUID } from "node:crypto";

import {
  computeAbsoluteExpiration,
  computeIdleExpiration,
  isSessionExpired,
} from "../policy/session-policy.js";
import type {
  AuthSession,
  SessionMetadata,
  SessionPolicy,
  SessionPrincipal,
} from "../types.js";

export interface SessionStore {
  createSession(
    principal: SessionPrincipal,
    metadata?: SessionMetadata,
    now?: Date,
  ): Promise<AuthSession>;
  getSession(sessionToken: string, now?: Date): Promise<AuthSession | null>;
  touchSession(sessionToken: string, now?: Date): Promise<AuthSession | null>;
  invalidateSession(sessionToken: string): Promise<void>;
  invalidateUserSessions(userId: string): Promise<number>;
}

export function buildSessionRecord(
  principal: SessionPrincipal,
  policy: SessionPolicy,
  metadata: SessionMetadata = {},
  now: Date = new Date(),
): AuthSession {
  const absoluteExpiresAt = computeAbsoluteExpiration(now, policy);
  const idleExpiresAt = computeIdleExpiration(now, policy, absoluteExpiresAt);

  return {
    sessionId: randomUUID(),
    sessionToken: randomBytes(32).toString("base64url"),
    userId: principal.userId,
    tenantId: principal.tenantId,
    roleIds: [...principal.roleIds],
    issuedAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
    idleExpiresAt: idleExpiresAt.toISOString(),
    absoluteExpiresAt: absoluteExpiresAt.toISOString(),
    ...(metadata.ipAddress === undefined
      ? {}
      : { ipAddress: metadata.ipAddress }),
    ...(metadata.userAgent === undefined
      ? {}
      : { userAgent: metadata.userAgent }),
  };
}

export function getSessionTtlSeconds(
  session: AuthSession,
  now: Date = new Date(),
): number | null {
  if (isSessionExpired(session, now)) {
    return null;
  }

  const idleExpiresAt = new Date(session.idleExpiresAt);

  return Math.max(
    1,
    Math.ceil((idleExpiresAt.getTime() - now.getTime()) / 1000),
  );
}

export function refreshSession(
  session: AuthSession,
  policy: SessionPolicy,
  now: Date = new Date(),
): AuthSession | null {
  if (isSessionExpired(session, now)) {
    return null;
  }

  const absoluteExpiresAt = new Date(session.absoluteExpiresAt);
  const idleExpiresAt = computeIdleExpiration(now, policy, absoluteExpiresAt);

  return {
    ...session,
    roleIds: [...session.roleIds],
    lastActivityAt: now.toISOString(),
    idleExpiresAt: idleExpiresAt.toISOString(),
  };
}
