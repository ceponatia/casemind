import type { AuthSession, SessionPolicy } from "../types.js";

export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  inactivityTimeoutMinutes: 30,
  absoluteTimeoutHours: 12,
  maxFailedAttempts: 5,
  secureCookies: false,
};

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

export function computeAbsoluteExpiration(
  issuedAt: Date,
  policy: SessionPolicy,
): Date {
  return addHours(issuedAt, policy.absoluteTimeoutHours);
}

export function computeIdleExpiration(
  lastActivityAt: Date,
  policy: SessionPolicy,
  absoluteExpiresAt: Date,
): Date {
  const idleExpiration = addMinutes(
    lastActivityAt,
    policy.inactivityTimeoutMinutes,
  );

  return idleExpiration.getTime() <= absoluteExpiresAt.getTime()
    ? idleExpiration
    : absoluteExpiresAt;
}

export function isSessionExpired(
  session: Pick<AuthSession, "idleExpiresAt" | "absoluteExpiresAt">,
  now: Date = new Date(),
): boolean {
  const idleExpiration = new Date(session.idleExpiresAt);
  const absoluteExpiration = new Date(session.absoluteExpiresAt);
  const effectiveExpiration = Math.min(
    idleExpiration.getTime(),
    absoluteExpiration.getTime(),
  );

  return now.getTime() >= effectiveExpiration;
}
