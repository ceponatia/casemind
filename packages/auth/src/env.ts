import type { LocalAuthConfig, SessionPolicy } from "./types.js";
import { DEFAULT_SESSION_POLICY } from "./policy/session-policy.js";

type EnvironmentMap = Record<string, string | undefined>;
function getDefaultEnv(): EnvironmentMap {
  return (
    (globalThis as { process?: { env?: EnvironmentMap } }).process?.env ?? {}
  );
}

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.length === 0) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected numeric environment value, received: ${value}`);
  }

  return parsed;
}

function readRequired(
  value: string | undefined,
  fallback: string,
  name: string,
): string {
  const resolved = value ?? fallback;

  if (resolved.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return resolved;
}

export function getLocalAuthConfig(
  env: EnvironmentMap = getDefaultEnv(),
): LocalAuthConfig {
  return {
    issuer: readRequired(
      env.CASEMIND_AUTH_ISSUER,
      "CaseMind Local",
      "CASEMIND_AUTH_ISSUER",
    ),
    sessionSecret: readRequired(
      env.CASEMIND_AUTH_SESSION_SECRET,
      "casemind-local-session-secret-change-me",
      "CASEMIND_AUTH_SESSION_SECRET",
    ),
    sessionCookieName: readRequired(
      env.CASEMIND_AUTH_SESSION_COOKIE_NAME,
      "casemind-session",
      "CASEMIND_AUTH_SESSION_COOKIE_NAME",
    ),
    sessionPolicy: {
      inactivityTimeoutMinutes: readNumber(
        env.CASEMIND_AUTH_INACTIVITY_TIMEOUT_MINUTES,
        DEFAULT_SESSION_POLICY.inactivityTimeoutMinutes,
      ),
      absoluteTimeoutHours: readNumber(
        env.CASEMIND_AUTH_ABSOLUTE_TIMEOUT_HOURS,
        DEFAULT_SESSION_POLICY.absoluteTimeoutHours,
      ),
      maxFailedAttempts: readNumber(
        env.CASEMIND_AUTH_MAX_FAILED_ATTEMPTS,
        DEFAULT_SESSION_POLICY.maxFailedAttempts,
      ),
      secureCookies:
        env.NODE_ENV === "production"
          ? true
          : DEFAULT_SESSION_POLICY.secureCookies,
    },
    syntheticTenantId: readRequired(
      env.CASEMIND_AUTH_SYNTHETIC_TENANT_ID,
      "tenant-local-demo",
      "CASEMIND_AUTH_SYNTHETIC_TENANT_ID",
    ),
    syntheticPassword: readRequired(
      env.CASEMIND_AUTH_SYNTHETIC_PASSWORD,
      "CaseMindLocal!23",
      "CASEMIND_AUTH_SYNTHETIC_PASSWORD",
    ),
  };
}
