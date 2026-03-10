import { describe, expect, it } from "vitest";

import {
  DEFAULT_SESSION_POLICY,
  computeAbsoluteExpiration,
  computeIdleExpiration,
  isSessionExpired,
} from "../../src/index.js";

describe("session policy", () => {
  it("caps idle expiration at the absolute expiration", () => {
    const issuedAt = new Date("2026-03-10T12:00:00.000Z");
    const absoluteExpiration = computeAbsoluteExpiration(
      issuedAt,
      DEFAULT_SESSION_POLICY,
    );
    const lastActivityAt = new Date("2026-03-10T23:55:00.000Z");

    expect(
      computeIdleExpiration(
        lastActivityAt,
        DEFAULT_SESSION_POLICY,
        absoluteExpiration,
      ).toISOString(),
    ).toBe(absoluteExpiration.toISOString());
  });

  it("expires a session once the idle window is exceeded", () => {
    expect(
      isSessionExpired(
        {
          idleExpiresAt: "2026-03-10T12:30:00.000Z",
          absoluteExpiresAt: "2026-03-10T18:00:00.000Z",
        },
        new Date("2026-03-10T12:30:00.000Z"),
      ),
    ).toBe(true);
  });
});
