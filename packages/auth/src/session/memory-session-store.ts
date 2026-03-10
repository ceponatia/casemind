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

export class MemorySessionStore implements SessionStore {
  readonly #policy: SessionPolicy;
  readonly #sessions = new Map<string, AuthSession>();
  readonly #tokensByUserId = new Map<string, Set<string>>();

  constructor(policy: SessionPolicy) {
    this.#policy = policy;
  }

  createSession(
    principal: SessionPrincipal,
    metadata: SessionMetadata = {},
    now: Date = new Date(),
  ): Promise<AuthSession> {
    const session = buildSessionRecord(principal, this.#policy, metadata, now);
    this.#sessions.set(session.sessionToken, session);

    const tokens =
      this.#tokensByUserId.get(session.userId) ?? new Set<string>();
    tokens.add(session.sessionToken);
    this.#tokensByUserId.set(session.userId, tokens);

    return Promise.resolve({
      ...session,
      roleIds: [...session.roleIds],
    });
  }

  async getSession(
    sessionToken: string,
    now: Date = new Date(),
  ): Promise<AuthSession | null> {
    const session = this.#sessions.get(sessionToken);

    if (session === undefined) {
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

    this.#sessions.set(sessionToken, refreshedSession);

    return {
      ...refreshedSession,
      roleIds: [...refreshedSession.roleIds],
    };
  }

  invalidateSession(sessionToken: string): Promise<void> {
    const session = this.#sessions.get(sessionToken);

    if (session === undefined) {
      return Promise.resolve();
    }

    this.#sessions.delete(sessionToken);
    const tokens = this.#tokensByUserId.get(session.userId);

    if (tokens === undefined) {
      return Promise.resolve();
    }

    tokens.delete(sessionToken);

    if (tokens.size === 0) {
      this.#tokensByUserId.delete(session.userId);
    }

    return Promise.resolve();
  }

  invalidateUserSessions(userId: string): Promise<number> {
    const tokens = this.#tokensByUserId.get(userId);

    if (tokens === undefined) {
      return Promise.resolve(0);
    }

    const count = tokens.size;

    for (const token of tokens) {
      this.#sessions.delete(token);
    }

    this.#tokensByUserId.delete(userId);
    return Promise.resolve(count);
  }
}
