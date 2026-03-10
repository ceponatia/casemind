import { createHash, randomInt } from "node:crypto";

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_SEGMENT_LENGTH = 4;
const RECOVERY_SEGMENTS = 4;

export function normalizeRecoveryCode(code: string): string {
  return code.replaceAll("-", "").trim().toUpperCase();
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256")
    .update(normalizeRecoveryCode(code), "utf8")
    .digest("hex");
}

function generateRecoveryCode(): string {
  const characters = Array.from(
    { length: RECOVERY_SEGMENT_LENGTH * RECOVERY_SEGMENTS },
    () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)],
  );
  const segments: string[] = [];

  for (
    let index = 0;
    index < characters.length;
    index += RECOVERY_SEGMENT_LENGTH
  ) {
    segments.push(
      characters.slice(index, index + RECOVERY_SEGMENT_LENGTH).join(""),
    );
  }

  return segments.join("-");
}

export function generateRecoveryCodes(count: number = 10): string[] {
  const codes = new Set<string>();

  while (codes.size < count) {
    codes.add(generateRecoveryCode());
  }

  return [...codes];
}

export function verifyRecoveryCodeHash(
  code: string,
  expectedHash: string,
): boolean {
  return hashRecoveryCode(code) === expectedHash;
}
