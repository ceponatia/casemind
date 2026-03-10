import { afterEach, describe, expect, it } from "vitest";

import { startRedisTestInstance } from "@casemind/test-utils";

import {
  createRedisSessionStoreFromUrl,
  DEFAULT_SESSION_POLICY,
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

describe("RedisSessionStore", () => {
  it("persists, refreshes, and invalidates sessions in Redis", async () => {
    const redisInstance = await startRedisTestInstance();
    cleaners.push(async () => {
      await redisInstance.stop();
    });

    const sessionStore = await createRedisSessionStoreFromUrl(
      redisInstance.connectionString,
      DEFAULT_SESSION_POLICY,
    );
    cleaners.push(async () => {
      await sessionStore.close();
    });

    const session = await sessionStore.createSession(
      {
        userId: "usr-apa",
        tenantId: "tenant-local-demo",
        roleIds: ["apa"],
      },
      {
        ipAddress: "127.0.0.1",
      },
      new Date("2026-03-10T12:00:00.000Z"),
    );

    const loadedSession = await sessionStore.getSession(
      session.sessionToken,
      new Date("2026-03-10T12:05:00.000Z"),
    );
    const refreshedSession = await sessionStore.touchSession(
      session.sessionToken,
      new Date("2026-03-10T12:10:00.000Z"),
    );

    expect(loadedSession?.userId).toBe("usr-apa");
    expect(refreshedSession?.lastActivityAt).toBe("2026-03-10T12:10:00.000Z");

    await sessionStore.invalidateUserSessions("usr-apa");

    expect(
      await sessionStore.getSession(
        session.sessionToken,
        new Date("2026-03-10T12:11:00.000Z"),
      ),
    ).toBeNull();
  });
});
