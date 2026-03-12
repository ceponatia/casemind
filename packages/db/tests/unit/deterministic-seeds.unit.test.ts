import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createDeterministicSeedSet } from "../../src/seeds/index.js";

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
});
