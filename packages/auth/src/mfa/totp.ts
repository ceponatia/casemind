import { createHmac, randomBytes, randomUUID } from "node:crypto";

import { generateRecoveryCodes, hashRecoveryCode } from "./recovery-codes.js";
import type {
  TotpEnrollmentActivation,
  TotpEnrollmentStart,
  TotpEnrollmentState,
} from "../types.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DEFAULT_DIGITS = 6;
const DEFAULT_PERIOD_SECONDS = 30;
const DEFAULT_WINDOW = 1;

export interface TotpSecretStore {
  saveSecret(userId: string, secret: string): string;
  getSecret(secretRef: string): string | undefined;
  deleteSecret(secretRef: string): void;
}

export function createInMemoryTotpSecretStore(): TotpSecretStore {
  const secrets = new Map<string, string>();

  return {
    saveSecret(userId, secret) {
      const secretRef = `totp:${userId}:${randomUUID()}`;
      secrets.set(secretRef, secret);
      return secretRef;
    },
    getSecret(secretRef) {
      return secrets.get(secretRef);
    },
    deleteSecret(secretRef) {
      secrets.delete(secretRef);
    },
  };
}

export function encodeBase32Bytes(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function decodeBase32Bytes(secret: string): Buffer {
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const character of secret.replaceAll("=", "").toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(character);

    if (index < 0) {
      throw new Error(`Invalid base32 character: ${character}`);
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function buildHotp(secret: string, counter: number, digits: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", decodeBase32Bytes(secret))
    .update(counterBuffer)
    .digest();
  const lastByte = digest.at(-1);

  if (lastByte === undefined) {
    throw new Error("Failed to generate HOTP digest.");
  }

  const offset = lastByte & 15;
  const first = digest[offset];
  const second = digest[offset + 1];
  const third = digest[offset + 2];
  const fourth = digest[offset + 3];

  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined
  ) {
    throw new Error("Invalid HOTP digest window.");
  }

  const binaryCode =
    ((first & 127) << 24) | (second << 16) | (third << 8) | fourth;

  return (binaryCode % 10 ** digits).toString().padStart(digits, "0");
}

export function generateTotpSecret(bytes: number = 20): string {
  return encodeBase32Bytes(randomBytes(bytes));
}

export function buildOtpAuthUri(options: {
  secret: string;
  issuer: string;
  accountName: string;
  digits?: number;
  periodSeconds?: number;
}): string {
  const digits = options.digits ?? DEFAULT_DIGITS;
  const periodSeconds = options.periodSeconds ?? DEFAULT_PERIOD_SECONDS;
  const label = `${options.issuer}:${options.accountName}`;

  return `otpauth://totp/${encodeURIComponent(label)}?secret=${options.secret}&issuer=${encodeURIComponent(options.issuer)}&algorithm=SHA1&digits=${digits}&period=${periodSeconds}`;
}

export function generateTotpCode(
  secret: string,
  time: Date = new Date(),
  digits: number = DEFAULT_DIGITS,
  periodSeconds: number = DEFAULT_PERIOD_SECONDS,
): string {
  const counter = Math.floor(time.getTime() / 1000 / periodSeconds);

  return buildHotp(secret, counter, digits);
}

export function verifyTotpCode(
  secret: string,
  code: string,
  time: Date = new Date(),
  window: number = DEFAULT_WINDOW,
  digits: number = DEFAULT_DIGITS,
  periodSeconds: number = DEFAULT_PERIOD_SECONDS,
): boolean {
  const normalizedCode = code.trim();
  const currentCounter = Math.floor(time.getTime() / 1000 / periodSeconds);

  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = buildHotp(secret, currentCounter + offset, digits);

    if (candidate === normalizedCode) {
      return true;
    }
  }

  return false;
}

function resolveSecret(
  state: TotpEnrollmentState,
  secretStore: TotpSecretStore,
): string {
  const secret = secretStore.getSecret(state.secretRef);

  if (secret === undefined) {
    throw new Error(`Unknown TOTP secret reference: ${state.secretRef}`);
  }

  return secret;
}

export function startTotpEnrollment(options: {
  userId: string;
  issuer: string;
  accountName: string;
  secretStore: TotpSecretStore;
  now?: Date;
}): TotpEnrollmentStart {
  const secret = generateTotpSecret();
  const secretRef = options.secretStore.saveSecret(options.userId, secret);
  const enrolledAt = (options.now ?? new Date()).toISOString();
  const state: TotpEnrollmentState = {
    userId: options.userId,
    secretRef,
    recoveryCodeHashes: [],
    enrolledAt,
  };

  return {
    state,
    secret,
    otpauthUri: buildOtpAuthUri({
      secret,
      issuer: options.issuer,
      accountName: options.accountName,
    }),
  };
}

export function activateTotpEnrollment(options: {
  state: TotpEnrollmentState;
  code: string;
  secretStore: TotpSecretStore;
  now?: Date;
  recoveryCodeCount?: number;
}): TotpEnrollmentActivation {
  const now = options.now ?? new Date();
  const secret = resolveSecret(options.state, options.secretStore);

  if (!verifyTotpCode(secret, options.code, now)) {
    throw new Error("Invalid TOTP code.");
  }

  const recoveryCodes = generateRecoveryCodes(options.recoveryCodeCount ?? 10);
  const state: TotpEnrollmentState = {
    ...options.state,
    recoveryCodeHashes: recoveryCodes.map((code) => hashRecoveryCode(code)),
    verifiedAt: now.toISOString(),
  };

  return {
    state,
    recoveryCodes,
  };
}

export function verifyEnrollmentChallenge(options: {
  state: TotpEnrollmentState;
  code: string;
  secretStore: TotpSecretStore;
  now?: Date;
}): boolean {
  const secret = resolveSecret(options.state, options.secretStore);

  return verifyTotpCode(secret, options.code, options.now ?? new Date());
}

export function consumeRecoveryCode(
  state: TotpEnrollmentState,
  recoveryCode: string,
): TotpEnrollmentState | null {
  const codeHash = hashRecoveryCode(recoveryCode);
  const recoveryCodeIndex = state.recoveryCodeHashes.findIndex(
    (candidate) => candidate === codeHash,
  );

  if (recoveryCodeIndex < 0) {
    return null;
  }

  return {
    ...state,
    recoveryCodeHashes: state.recoveryCodeHashes.filter(
      (_, index) => index !== recoveryCodeIndex,
    ),
  };
}
