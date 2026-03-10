import { afterEach, describe, expect, it } from "vitest";

import {
  startMongoTestInstance,
  startPostgresTestInstance,
  startRedisTestInstance,
} from "../../src/index.js";

const cleaners: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleaners.length > 0) {
    const stop = cleaners.pop();

    if (stop) {
      await stop();
    }
  }
});

describe("testcontainers helpers", () => {
  it("starts a disposable postgres container", async () => {
    const instance = await startPostgresTestInstance();
    cleaners.push(async () => {
      await instance.stop();
    });

    expect(instance.connectionString).toContain("postgresql://");
    expect(instance.connectionString).toContain("casemind_test");
  });

  it("starts a disposable mongo container", async () => {
    const instance = await startMongoTestInstance();
    cleaners.push(async () => {
      await instance.stop();
    });

    expect(instance.connectionString).toContain("mongodb://");
    expect(instance.databaseName).toBe("casemind_test");
  });

  it("starts a disposable redis container", async () => {
    const instance = await startRedisTestInstance();
    cleaners.push(async () => {
      await instance.stop();
    });

    expect(instance.connectionString).toContain("redis://");
  });
});
