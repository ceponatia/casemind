import { createClient } from "redis";

import {
  buildSessionRecord,
  getSessionTtlSeconds,
  refreshSession,
  type SessionStore,
} from "./session-store.js";
import type {
  AuthSession,
  SessionMetadata,
  SessionPolicy,
  SessionPrincipal,
} from "../types.js";

interface RedisSessionClient {
  quit?(): Promise<unknown>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX: number }): Promise<unknown>;
  del(key: string): Promise<number>;
  sAdd(key: string, member: string): Promise<number>;
  sMembers(key: string): Promise<string[]>;
  sRem(key: string, member: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean | number>;
}

export interface RedisSessionStoreOptions {
  keyPrefix?: string;
}

export class RedisSessionStore implements SessionStore {
  readonly #client: RedisSessionClient;
  readonly #policy: SessionPolicy;
  readonly #keyPrefix: string;

  constructor(
    client: RedisSessionClient,
    policy: SessionPolicy,
    options: RedisSessionStoreOptions = {},
  ) {
    this.#client = client;
    this.#policy = policy;
    this.#keyPrefix = options.keyPrefix ?? "casemind:auth";
  }

  #sessionKey(sessionToken: string): string {
    return `${this.#keyPrefix}:session:${sessionToken}`;
  }

  #userIndexKey(userId: string): string {
    return `${this.#keyPrefix}:user:${userId}:sessions`;
  }

  async #writeSession(session: AuthSession, now: Date): Promise<void> {
    const ttlSeconds = getSessionTtlSeconds(session, now);

    if (ttlSeconds === null) {
      throw new Error("Cannot persist an expired session.");
    }

    await this.#client.set(
      this.#sessionKey(session.sessionToken),
      JSON.stringify(session),
      { EX: ttlSeconds },
    );
    await this.#client.sAdd(
      this.#userIndexKey(session.userId),
      session.sessionToken,
    );
    await this.#client.expire(
      this.#userIndexKey(session.userId),
      Math.max(ttlSeconds, this.#policy.absoluteTimeoutHours * 3600),
    );
  }

  async #readSession(sessionToken: string): Promise<AuthSession | null> {
    const payload = await this.#client.get(this.#sessionKey(sessionToken));

    if (payload === null) {
      return null;
    }

    return JSON.parse(payload) as AuthSession;
  }

  async createSession(
    principal: SessionPrincipal,
    metadata: SessionMetadata = {},
    now: Date = new Date(),
  ): Promise<AuthSession> {
    const session = buildSessionRecord(principal, this.#policy, metadata, now);
    await this.#writeSession(session, now);

    return {
      ...session,
      roleIds: [...session.roleIds],
    };
  }

  async getSession(
    sessionToken: string,
    now: Date = new Date(),
  ): Promise<AuthSession | null> {
    const session = await this.#readSession(sessionToken);

    if (session === null) {
      return null;
    }

    if (getSessionTtlSeconds(session, now) === null) {
      await this.invalidateSession(sessionToken);
      return null;
    }

    return {
      ...session,
      roleIds: [...session.roleIds],
    };
  }

  async touchSession(
    sessionToken: string,
    now: Date = new Date(),
  ): Promise<AuthSession | null> {
    const session = await this.getSession(sessionToken, now);

    if (session === null) {
      return null;
    }

    const refreshedSession = refreshSession(session, this.#policy, now);

    if (refreshedSession === null) {
      await this.invalidateSession(sessionToken);
      return null;
    }

    await this.#writeSession(refreshedSession, now);

    return {
      ...refreshedSession,
      roleIds: [...refreshedSession.roleIds],
    };
  }

  async invalidateSession(sessionToken: string): Promise<void> {
    const session = await this.#readSession(sessionToken);

    if (session !== null) {
      await this.#client.sRem(this.#userIndexKey(session.userId), sessionToken);
    }

    await this.#client.del(this.#sessionKey(sessionToken));
  }

  async invalidateUserSessions(userId: string): Promise<number> {
    const indexKey = this.#userIndexKey(userId);
    const sessionTokens = await this.#client.sMembers(indexKey);

    for (const sessionToken of sessionTokens) {
      await this.#client.del(this.#sessionKey(sessionToken));
    }

    await this.#client.del(indexKey);
    return sessionTokens.length;
  }

  async close(): Promise<void> {
    if (this.#client.quit !== undefined) {
      await this.#client.quit();
    }
  }
}

export async function createRedisSessionStoreFromUrl(
  url: string,
  policy: SessionPolicy,
  options: RedisSessionStoreOptions = {},
): Promise<RedisSessionStore> {
  const client = createClient({ url });
  await client.connect();
  return new RedisSessionStore(client, policy, options);
}
