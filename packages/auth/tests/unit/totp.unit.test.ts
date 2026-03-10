import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  activateTotpEnrollment,
  createInMemoryTotpSecretStore,
  decodeBase32Bytes,
  encodeBase32Bytes,
  generateTotpCode,
  startTotpEnrollment,
  verifyEnrollmentChallenge,
} from "../../src/index.js";

describe("TOTP enrollment", () => {
  it("generates and verifies a TOTP code", () => {
    const secretStore = createInMemoryTotpSecretStore();
    const enrollment = startTotpEnrollment({
      userId: "usr-1",
      issuer: "CaseMind Local",
      accountName: "apa@local.casemind.test",
      secretStore,
      now: new Date("2026-03-10T12:00:00.000Z"),
    });
    const code = generateTotpCode(
      enrollment.secret,
      new Date("2026-03-10T12:00:00.000Z"),
    );

    expect(
      verifyEnrollmentChallenge({
        state: enrollment.state,
        code,
        secretStore,
        now: new Date("2026-03-10T12:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("activates MFA and issues recovery codes", () => {
    const secretStore = createInMemoryTotpSecretStore();
    const enrollment = startTotpEnrollment({
      userId: "usr-2",
      issuer: "CaseMind Local",
      accountName: "office.admin@local.casemind.test",
      secretStore,
      now: new Date("2026-03-10T12:00:00.000Z"),
    });
    const code = generateTotpCode(
      enrollment.secret,
      new Date("2026-03-10T12:00:00.000Z"),
    );

    const activation = activateTotpEnrollment({
      state: enrollment.state,
      code,
      secretStore,
      now: new Date("2026-03-10T12:00:00.000Z"),
    });

    expect(activation.state.verifiedAt).toBe("2026-03-10T12:00:00.000Z");
    expect(activation.recoveryCodes).toHaveLength(10);
  });

  it("round-trips arbitrary bytes through the base32 codec", () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 128 }), (value) => {
        expect([...decodeBase32Bytes(encodeBase32Bytes(value))]).toEqual([
          ...value,
        ]);
      }),
    );
  });
});
