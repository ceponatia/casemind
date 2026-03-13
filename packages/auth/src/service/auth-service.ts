import { getLocalAuthConfig } from "../env.js";
import {
  activateTotpEnrollment,
  consumeRecoveryCode,
  createInMemoryTotpSecretStore,
  startTotpEnrollment,
  verifyEnrollmentChallenge,
  type TotpSecretStore,
} from "../mfa/totp.js";
import { DEFAULT_SESSION_POLICY } from "../policy/session-policy.js";
import type {
  AuthAuditEvent,
  AuthAuditSink,
  AuthSession,
  AuthenticatedUser,
  CreateLocalUserInput,
  LocalAuthConfig,
  LoginInput,
  LoginResult,
  TotpEnrollmentActivation,
  TotpEnrollmentStart,
} from "../types.js";
import { type SessionStore } from "../session/session-store.js";
import { InMemoryUserDirectory } from "../users/in-memory-user-directory.js";
import { createSyntheticLocalAccounts } from "../users/synthetic-users.js";

export interface AuthServiceDependencies {
  config?: LocalAuthConfig;
  sessionStore: SessionStore;
  userDirectory?: InMemoryUserDirectory;
  totpSecretStore?: TotpSecretStore;
  auditSink?: AuthAuditSink;
}

const noopAuditSink: AuthAuditSink = {
  record() {},
};

export class AuthService {
  readonly #config: LocalAuthConfig;
  readonly #sessionStore: SessionStore;
  readonly #userDirectory: InMemoryUserDirectory;
  readonly #totpSecretStore: TotpSecretStore;
  readonly #auditSink: AuthAuditSink;

  constructor(dependencies: AuthServiceDependencies) {
    this.#config = dependencies.config ?? getLocalAuthConfig();
    this.#sessionStore = dependencies.sessionStore;
    this.#userDirectory =
      dependencies.userDirectory ??
      new InMemoryUserDirectory(createSyntheticLocalAccounts(this.#config));
    this.#totpSecretStore =
      dependencies.totpSecretStore ?? createInMemoryTotpSecretStore();
    this.#auditSink = dependencies.auditSink ?? noopAuditSink;
  }

  async #recordAuditEvent(event: AuthAuditEvent): Promise<void> {
    await this.#auditSink.record(event);
  }

  get config(): LocalAuthConfig {
    return {
      ...this.#config,
      sessionPolicy: {
        ...this.#config.sessionPolicy,
      },
    };
  }

  listUsers(): AuthenticatedUser[] {
    return this.#userDirectory.listUsers();
  }

  createUser(input: CreateLocalUserInput): AuthenticatedUser {
    return this.#userDirectory.createUser(input);
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const primaryResult = this.#userDirectory.authenticatePrimaryFactor(
      input.email,
      input.password,
      this.#config.sessionPolicy.maxFailedAttempts,
    );

    if (primaryResult.status !== "success") {
      const matchingAccount = this.#userDirectory.getAccountByEmail(
        input.email,
      );

      await this.#recordAuditEvent({
        type: "auth.login.failed",
        occurredAt: (input.now ?? new Date()).toISOString(),
        email: input.email.trim().toLowerCase(),
        ...(matchingAccount === undefined
          ? {}
          : {
              userId: matchingAccount.userId,
              tenantId: matchingAccount.tenantId,
            }),
        ...(input.ipAddress === undefined
          ? {}
          : { ipAddress: input.ipAddress }),
        ...(input.userAgent === undefined
          ? {}
          : { userAgent: input.userAgent }),
        reason: primaryResult.status,
      });
      return primaryResult;
    }

    const account = this.#userDirectory.getAccount(primaryResult.user.userId);

    if (account === undefined) {
      throw new Error(`Unknown userId: ${primaryResult.user.userId}`);
    }

    if (account.mfaEnabled) {
      const mfaEnrollment = account.mfaEnrollment;

      if (mfaEnrollment === undefined) {
        throw new Error(`Missing MFA enrollment for userId: ${account.userId}`);
      }

      if (input.recoveryCode !== undefined) {
        const updatedEnrollment = consumeRecoveryCode(
          mfaEnrollment,
          input.recoveryCode,
        );

        if (updatedEnrollment === null) {
          await this.#recordAuditEvent({
            type: "auth.login.failed",
            occurredAt: (input.now ?? new Date()).toISOString(),
            userId: account.userId,
            tenantId: account.tenantId,
            email: account.email,
            reason: "invalid_recovery_code",
          });
          return { status: "invalid_credentials" };
        }

        this.#userDirectory.setMfaEnrollment(account.userId, updatedEnrollment);
      } else if (
        input.totpCode === undefined ||
        !verifyEnrollmentChallenge({
          state: mfaEnrollment,
          code: input.totpCode,
          secretStore: this.#totpSecretStore,
          ...(input.now === undefined ? {} : { now: input.now }),
        })
      ) {
        await this.#recordAuditEvent({
          type: "auth.login.mfa_required",
          occurredAt: (input.now ?? new Date()).toISOString(),
          userId: account.userId,
          tenantId: account.tenantId,
          email: account.email,
          ...(input.ipAddress === undefined
            ? {}
            : { ipAddress: input.ipAddress }),
          ...(input.userAgent === undefined
            ? {}
            : { userAgent: input.userAgent }),
        });
        return { status: "mfa_required", user: primaryResult.user };
      }
    }

    const session = await this.#sessionStore.createSession(
      {
        userId: primaryResult.user.userId,
        tenantId: primaryResult.user.tenantId,
        roleIds: primaryResult.user.roleIds,
      },
      {
        ...(input.ipAddress === undefined
          ? {}
          : { ipAddress: input.ipAddress }),
        ...(input.userAgent === undefined
          ? {}
          : { userAgent: input.userAgent }),
      },
      input.now,
    );

    await this.#recordAuditEvent({
      type: "auth.login.succeeded",
      occurredAt: (input.now ?? new Date()).toISOString(),
      userId: primaryResult.user.userId,
      tenantId: primaryResult.user.tenantId,
      email: primaryResult.user.email,
      sessionId: session.sessionId,
      ...(input.ipAddress === undefined ? {} : { ipAddress: input.ipAddress }),
      ...(input.userAgent === undefined ? {} : { userAgent: input.userAgent }),
    });

    return {
      status: "success",
      user: primaryResult.user,
      session,
    };
  }

  async getSession(
    sessionToken: string,
    now?: Date,
  ): Promise<AuthSession | null> {
    return this.#sessionStore.getSession(sessionToken, now);
  }

  async touchSession(
    sessionToken: string,
    now?: Date,
  ): Promise<AuthSession | null> {
    return this.#sessionStore.touchSession(sessionToken, now);
  }

  async invalidateSession(sessionToken: string): Promise<void> {
    const session = await this.#sessionStore.getSession(sessionToken);
    await this.#sessionStore.invalidateSession(sessionToken);
    await this.#recordAuditEvent({
      type: "auth.session.invalidated",
      occurredAt: new Date().toISOString(),
      ...(session === null
        ? {}
        : {
            userId: session.userId,
            tenantId: session.tenantId,
            sessionId: session.sessionId,
            ...(session.ipAddress === undefined
              ? {}
              : { ipAddress: session.ipAddress }),
            ...(session.userAgent === undefined
              ? {}
              : { userAgent: session.userAgent }),
          }),
      reason: "manual_invalidation",
    });
  }

  startTotpEnrollment(
    userId: string,
    accountName?: string,
    now?: Date,
  ): TotpEnrollmentStart {
    const account = this.#userDirectory.getAccount(userId);

    if (account === undefined) {
      throw new Error(`Unknown userId: ${userId}`);
    }

    if (account.mfaEnrollment !== undefined) {
      this.#totpSecretStore.deleteSecret(account.mfaEnrollment.secretRef);
    }

    const enrollment = startTotpEnrollment({
      userId,
      issuer: this.#config.issuer,
      accountName: accountName ?? account.email,
      secretStore: this.#totpSecretStore,
      ...(now === undefined ? {} : { now }),
    });

    this.#userDirectory.setMfaEnrollment(userId, enrollment.state);
    void this.#recordAuditEvent({
      type: "auth.mfa.enrollment.started",
      occurredAt: (now ?? new Date()).toISOString(),
      userId: account.userId,
      tenantId: account.tenantId,
      email: account.email,
    });
    return enrollment;
  }

  activateTotpEnrollment(
    userId: string,
    code: string,
    now?: Date,
  ): TotpEnrollmentActivation {
    const account = this.#userDirectory.getAccount(userId);

    if (account?.mfaEnrollment === undefined) {
      throw new Error(`No active MFA enrollment for userId: ${userId}`);
    }

    const activation = activateTotpEnrollment({
      state: account.mfaEnrollment,
      code,
      secretStore: this.#totpSecretStore,
      ...(now === undefined ? {} : { now }),
    });

    this.#userDirectory.setMfaEnrollment(userId, activation.state);
    void this.#recordAuditEvent({
      type: "auth.mfa.enrollment.activated",
      occurredAt: (now ?? new Date()).toISOString(),
      userId: account.userId,
      tenantId: account.tenantId,
      email: account.email,
    });
    return activation;
  }

  async resetMfa(userId: string): Promise<void> {
    const account = this.#userDirectory.getAccount(userId);

    if (account?.mfaEnrollment !== undefined) {
      this.#totpSecretStore.deleteSecret(account.mfaEnrollment.secretRef);
    }

    this.#userDirectory.resetMfa(userId);
    await this.#sessionStore.invalidateUserSessions(userId);
    await this.#recordAuditEvent({
      type: "auth.mfa.reset",
      occurredAt: new Date().toISOString(),
      ...(account?.userId === undefined ? {} : { userId: account.userId }),
      ...(account?.tenantId === undefined
        ? {}
        : { tenantId: account.tenantId }),
      ...(account?.email === undefined ? {} : { email: account.email }),
    });
  }

  resetLockout(userId: string): void {
    const account = this.#userDirectory.getAccount(userId);
    this.#userDirectory.resetLockout(userId);
    void this.#recordAuditEvent({
      type: "auth.lockout.reset",
      occurredAt: new Date().toISOString(),
      ...(account === undefined
        ? { userId }
        : {
            userId: account.userId,
            tenantId: account.tenantId,
            email: account.email,
          }),
    });
  }

  async deactivateUser(userId: string): Promise<void> {
    const account = this.#userDirectory.getAccount(userId);
    this.#userDirectory.deactivateUser(userId);
    await this.#sessionStore.invalidateUserSessions(userId);
    await this.#recordAuditEvent({
      type: "auth.account.deactivated",
      occurredAt: new Date().toISOString(),
      ...(account?.userId === undefined ? {} : { userId: account.userId }),
      ...(account?.tenantId === undefined
        ? {}
        : { tenantId: account.tenantId }),
      ...(account?.email === undefined ? {} : { email: account.email }),
    });
  }

  async updatePassword(userId: string, nextPassword: string): Promise<void> {
    const account = this.#userDirectory.getAccount(userId);
    this.#userDirectory.updatePassword(userId, nextPassword);
    await this.#sessionStore.invalidateUserSessions(userId);
    await this.#recordAuditEvent({
      type: "auth.password.updated",
      occurredAt: new Date().toISOString(),
      ...(account?.userId === undefined ? {} : { userId: account.userId }),
      ...(account?.tenantId === undefined
        ? {}
        : { tenantId: account.tenantId }),
      ...(account?.email === undefined ? {} : { email: account.email }),
    });
  }
}

export function createDefaultAuthService(
  sessionStore: SessionStore,
  config: LocalAuthConfig = getLocalAuthConfig(),
): AuthService {
  return new AuthService({
    config: {
      ...config,
      sessionPolicy: {
        ...DEFAULT_SESSION_POLICY,
        ...config.sessionPolicy,
      },
    },
    sessionStore,
  });
}
