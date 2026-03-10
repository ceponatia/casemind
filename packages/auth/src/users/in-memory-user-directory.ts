import { hashPassword, verifyPassword } from "../crypto/password.js";
import { assertPasswordPolicy } from "../policy/password-policy.js";
import type {
  AuthenticatedUser,
  CreateLocalUserInput,
  LocalUserAccount,
  PrimaryAuthenticationResult,
  TotpEnrollmentState,
} from "../types.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toAuthenticatedUser(account: LocalUserAccount): AuthenticatedUser {
  return {
    userId: account.userId,
    tenantId: account.tenantId,
    email: account.email,
    displayName: account.displayName,
    roleIds: [...account.roleIds],
    mfaEnabled: account.mfaEnabled,
    accountLocked: account.accountLocked,
  };
}

export function createLocalUserAccount(
  input: CreateLocalUserInput,
): LocalUserAccount {
  assertPasswordPolicy(input.password);

  return {
    userId: input.userId,
    tenantId: input.tenantId,
    email: normalizeEmail(input.email),
    displayName: input.displayName,
    roleIds: [...input.roleIds],
    mfaEnabled: false,
    accountLocked: false,
    passwordHash: hashPassword(input.password),
    accountActive: true,
    failedAttempts: 0,
  };
}

export class InMemoryUserDirectory {
  readonly #accountsById = new Map<string, LocalUserAccount>();
  readonly #userIdByEmail = new Map<string, string>();

  constructor(accounts: Iterable<LocalUserAccount> = []) {
    for (const account of accounts) {
      this.#insertAccount(account);
    }
  }

  #insertAccount(account: LocalUserAccount): void {
    if (this.#accountsById.has(account.userId)) {
      throw new Error(`Duplicate userId detected: ${account.userId}`);
    }

    const normalizedEmail = normalizeEmail(account.email);

    if (this.#userIdByEmail.has(normalizedEmail)) {
      throw new Error(`Duplicate email detected: ${normalizedEmail}`);
    }

    const storedAccount: LocalUserAccount = {
      ...account,
      email: normalizedEmail,
      roleIds: [...account.roleIds],
      ...(account.mfaEnrollment === undefined
        ? {}
        : {
            mfaEnrollment: {
              ...account.mfaEnrollment,
              recoveryCodeHashes: [...account.mfaEnrollment.recoveryCodeHashes],
            },
          }),
    };

    this.#accountsById.set(account.userId, storedAccount);
    this.#userIdByEmail.set(normalizedEmail, account.userId);
  }

  #requireAccount(userId: string): LocalUserAccount {
    const account = this.#accountsById.get(userId);

    if (account === undefined) {
      throw new Error(`Unknown userId: ${userId}`);
    }

    return account;
  }

  listUsers(): AuthenticatedUser[] {
    return [...this.#accountsById.values()].map((account) =>
      toAuthenticatedUser(account),
    );
  }

  getAccount(userId: string): LocalUserAccount | undefined {
    const account = this.#accountsById.get(userId);

    if (account === undefined) {
      return undefined;
    }

    return {
      ...account,
      roleIds: [...account.roleIds],
      ...(account.mfaEnrollment === undefined
        ? {}
        : {
            mfaEnrollment: {
              ...account.mfaEnrollment,
              recoveryCodeHashes: [...account.mfaEnrollment.recoveryCodeHashes],
            },
          }),
    };
  }

  createUser(input: CreateLocalUserInput): AuthenticatedUser {
    const account = createLocalUserAccount(input);
    this.#insertAccount(account);
    return toAuthenticatedUser(account);
  }

  authenticatePrimaryFactor(
    email: string,
    password: string,
    maxFailedAttempts: number,
  ): PrimaryAuthenticationResult {
    const normalizedEmail = normalizeEmail(email);
    const userId = this.#userIdByEmail.get(normalizedEmail);

    if (userId === undefined) {
      return { status: "invalid_credentials" };
    }

    const account = this.#requireAccount(userId);

    if (!account.accountActive) {
      return { status: "account_inactive" };
    }

    if (account.accountLocked) {
      return { status: "account_locked" };
    }

    if (!verifyPassword(password, account.passwordHash)) {
      account.failedAttempts += 1;

      if (account.failedAttempts >= maxFailedAttempts) {
        account.accountLocked = true;
        return { status: "account_locked" };
      }

      return { status: "invalid_credentials" };
    }

    account.failedAttempts = 0;
    account.accountLocked = false;

    return {
      status: "success",
      user: toAuthenticatedUser(account),
    };
  }

  setMfaEnrollment(userId: string, state: TotpEnrollmentState): void {
    const account = this.#requireAccount(userId);

    account.mfaEnrollment = {
      ...state,
      recoveryCodeHashes: [...state.recoveryCodeHashes],
    };
    account.mfaEnabled = state.verifiedAt !== undefined;
  }

  resetMfa(userId: string): void {
    const account = this.#requireAccount(userId);

    delete account.mfaEnrollment;
    account.mfaEnabled = false;
  }

  resetLockout(userId: string): void {
    const account = this.#requireAccount(userId);

    account.failedAttempts = 0;
    account.accountLocked = false;
  }

  deactivateUser(userId: string): void {
    const account = this.#requireAccount(userId);

    account.accountActive = false;
    account.accountLocked = true;
  }

  updatePassword(userId: string, nextPassword: string): void {
    const account = this.#requireAccount(userId);

    assertPasswordPolicy(nextPassword);

    account.passwordHash = hashPassword(nextPassword);
    account.failedAttempts = 0;
    account.accountLocked = false;
  }
}
