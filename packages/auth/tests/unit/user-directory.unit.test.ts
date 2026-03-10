import { describe, expect, it } from "vitest";

import {
  InMemoryUserDirectory,
  createLocalUserAccount,
  createSyntheticLocalAccounts,
} from "../../src/index.js";

describe("InMemoryUserDirectory", () => {
  it("authenticates emails case-insensitively and trims whitespace", () => {
    const directory = new InMemoryUserDirectory(createSyntheticLocalAccounts());

    const result = directory.authenticatePrimaryFactor(
      "  APA@LOCAL.CASEMIND.TEST ",
      "CaseMindLocal!23",
      5,
    );

    expect(result.status).toBe("success");
  });

  it("rejects duplicate normalized emails", () => {
    const account = createLocalUserAccount({
      userId: "usr-a",
      tenantId: "tenant-a",
      email: "duplicate@local.casemind.test",
      displayName: "User A",
      roleIds: ["apa"],
      password: "CaseMindLocal!23",
    });

    expect(
      () =>
        new InMemoryUserDirectory([
          account,
          createLocalUserAccount({
            userId: "usr-b",
            tenantId: "tenant-a",
            email: "  DUPLICATE@local.casemind.test ",
            displayName: "User B",
            roleIds: ["apa"],
            password: "CaseMindLocal!23",
          }),
        ]),
    ).toThrow(/duplicate email/i);
  });
});
