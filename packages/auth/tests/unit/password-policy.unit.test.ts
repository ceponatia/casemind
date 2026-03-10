import { describe, expect, it } from "vitest";

import {
  assertPasswordPolicy,
  validatePasswordAgainstPolicy,
} from "../../src/index.js";

describe("password policy", () => {
  it("rejects weak passwords", () => {
    expect(() => assertPasswordPolicy("weakpass")).toThrow(/uppercase/i);
  });

  it("accepts strong passwords", () => {
    expect(() => assertPasswordPolicy("CaseMindLocal!23")).not.toThrow();
  });

  it("returns all violations for an invalid password", () => {
    expect(validatePasswordAgainstPolicy("short")).toHaveLength(4);
  });
});
