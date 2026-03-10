import { describe, expect, it } from "vitest";

import {
  AuthService,
  MemorySessionStore,
  createSyntheticLocalAccounts,
  generateTotpCode,
  InMemoryUserDirectory,
} from "../../src/index.js";

describe("AuthService", () => {
  it("creates a local session for a seeded synthetic user", async () => {
    const authService = new AuthService({
      sessionStore: new MemorySessionStore({
        inactivityTimeoutMinutes: 30,
        absoluteTimeoutHours: 12,
        maxFailedAttempts: 5,
        secureCookies: false,
      }),
      userDirectory: new InMemoryUserDirectory(createSyntheticLocalAccounts()),
    });

    const result = await authService.login({
      email: "apa@local.casemind.test",
      password: "CaseMindLocal!23",
      now: new Date("2026-03-10T12:00:00.000Z"),
    });

    expect(result.status).toBe("success");

    if (result.status === "success") {
      expect(result.user.tenantId).toBe("tenant-local-demo");
      expect(result.session.sessionToken.length).toBeGreaterThan(20);
    }
  });

  it("locks a user after five failed attempts and allows an admin reset", async () => {
    const authService = new AuthService({
      sessionStore: new MemorySessionStore({
        inactivityTimeoutMinutes: 30,
        absoluteTimeoutHours: 12,
        maxFailedAttempts: 5,
        secureCookies: false,
      }),
      userDirectory: new InMemoryUserDirectory(createSyntheticLocalAccounts()),
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const result = await authService.login({
        email: "apa@local.casemind.test",
        password: "wrong-password",
      });

      expect(result.status).toBe("invalid_credentials");
    }

    const lockedResult = await authService.login({
      email: "apa@local.casemind.test",
      password: "wrong-password",
    });

    expect(lockedResult.status).toBe("account_locked");

    authService.resetLockout("usr-apa");

    const recoveredResult = await authService.login({
      email: "apa@local.casemind.test",
      password: "CaseMindLocal!23",
    });

    expect(recoveredResult.status).toBe("success");
  });

  it("requires MFA after enrollment and accepts a valid TOTP code", async () => {
    const authService = new AuthService({
      sessionStore: new MemorySessionStore({
        inactivityTimeoutMinutes: 30,
        absoluteTimeoutHours: 12,
        maxFailedAttempts: 5,
        secureCookies: false,
      }),
      userDirectory: new InMemoryUserDirectory(createSyntheticLocalAccounts()),
    });
    const enrollment = authService.startTotpEnrollment(
      "usr-apa",
      "apa@local.casemind.test",
      new Date("2026-03-10T12:00:00.000Z"),
    );

    authService.activateTotpEnrollment(
      "usr-apa",
      generateTotpCode(enrollment.secret, new Date("2026-03-10T12:00:00.000Z")),
      new Date("2026-03-10T12:00:00.000Z"),
    );

    const missingCodeResult = await authService.login({
      email: "apa@local.casemind.test",
      password: "CaseMindLocal!23",
      now: new Date("2026-03-10T12:00:00.000Z"),
    });

    expect(missingCodeResult.status).toBe("mfa_required");

    const result = await authService.login({
      email: "apa@local.casemind.test",
      password: "CaseMindLocal!23",
      totpCode: generateTotpCode(
        enrollment.secret,
        new Date("2026-03-10T12:00:00.000Z"),
      ),
      now: new Date("2026-03-10T12:00:00.000Z"),
    });

    expect(result.status).toBe("success");
  });

  it("emits audit events for failed and successful authentication", async () => {
    const recordedEvents: string[] = [];
    const authService = new AuthService({
      sessionStore: new MemorySessionStore({
        inactivityTimeoutMinutes: 30,
        absoluteTimeoutHours: 12,
        maxFailedAttempts: 5,
        secureCookies: false,
      }),
      userDirectory: new InMemoryUserDirectory(createSyntheticLocalAccounts()),
      auditSink: {
        record(event) {
          recordedEvents.push(event.type);
        },
      },
    });

    await authService.login({
      email: "apa@local.casemind.test",
      password: "wrong-password",
    });
    await authService.login({
      email: "apa@local.casemind.test",
      password: "CaseMindLocal!23",
    });

    expect(recordedEvents).toContain("auth.login.failed");
    expect(recordedEvents).toContain("auth.login.succeeded");
  });

  it("rejects weak password updates", async () => {
    const authService = new AuthService({
      sessionStore: new MemorySessionStore({
        inactivityTimeoutMinutes: 30,
        absoluteTimeoutHours: 12,
        maxFailedAttempts: 5,
        secureCookies: false,
      }),
      userDirectory: new InMemoryUserDirectory(createSyntheticLocalAccounts()),
    });

    await expect(
      authService.updatePassword("usr-apa", "weakpass"),
    ).rejects.toThrow(/password/i);
  });
});
