import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  createDeterministicSeedSet,
  createLocalDevelopmentSeedSets,
} from "../../src/seeds/index.js";

describe("createDeterministicSeedSet", () => {
  it("returns stable identifiers for the same tenant inputs", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tenantId) => {
        const first = createDeterministicSeedSet({
          tenantId,
          actorUserId: "actor-1",
        });
        const second = createDeterministicSeedSet({
          tenantId,
          actorUserId: "actor-1",
        });

        expect(second).toEqual(first);
      }),
    );
  });

  it("creates two local seed tenants with the full role set", () => {
    const seedSets = createLocalDevelopmentSeedSets();

    expect(seedSets).toHaveLength(2);
    expect(seedSets[0]?.users).toHaveLength(7);
    expect(seedSets[1]?.context.tenantId).not.toEqual(seedSets[0]?.context.tenantId);
  });
});
