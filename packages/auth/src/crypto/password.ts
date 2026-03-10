import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function splitHash(hash: string): { salt: string; digest: string } {
  const parts = hash.split("$");

  if (parts.length !== 3 || parts[0] !== "scrypt") {
    throw new Error("Unsupported password hash format.");
  }

  const salt = parts[1];
  const digest = parts[2];

  if (salt === undefined || digest === undefined) {
    throw new Error("Invalid password hash payload.");
  }

  return {
    salt,
    digest,
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const { salt, digest } = splitHash(hash);
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(digest, "hex");

  return timingSafeEqual(candidate, expected);
}
