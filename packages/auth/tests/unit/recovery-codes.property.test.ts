import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCodeHash,
} from "../../src/index.js";

describe("recovery codes", () => {
  it("generates unique codes for varying batch sizes", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 15 }), (count) => {
        const codes = generateRecoveryCodes(count);
        expect(new Set(codes).size).toBe(count);
      }),
    );
  });

  it("normalizes formatting when verifying a code hash", () => {
    const code = generateRecoveryCodes(1)[0];

    if (code === undefined) {
      throw new Error("Expected at least one recovery code.");
    }

    expect(
      verifyRecoveryCodeHash(code.toLowerCase(), hashRecoveryCode(code)),
    ).toBe(true);
  });
});
