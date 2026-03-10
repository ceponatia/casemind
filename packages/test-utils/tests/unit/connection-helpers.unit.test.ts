import { describe, expect, it } from "vitest";

import {
  buildMongoConnectionString,
  buildPostgresConnectionString,
  buildRedisConnectionString,
} from "../../src/index.js";

describe("container connection helpers", () => {
  it("builds postgres connection strings", () => {
    expect(
      buildPostgresConnectionString("localhost", 5432, "db", "user", "pass"),
    ).toBe("postgresql://user:pass@localhost:5432/db");
  });

  it("builds mongo connection strings", () => {
    expect(buildMongoConnectionString("localhost", 27017, "db")).toBe(
      "mongodb://localhost:27017/db",
    );
  });

  it("builds redis connection strings", () => {
    expect(buildRedisConnectionString("localhost", 6379)).toBe(
      "redis://localhost:6379",
    );
  });
});
