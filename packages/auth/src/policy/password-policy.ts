import type { PasswordPolicy } from "../types.js";

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialCharacter: true,
};

export function validatePasswordAgainstPolicy(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): string[] {
  const violations: string[] = [];

  if (password.length < policy.minLength) {
    violations.push(
      `Password must be at least ${policy.minLength} characters.`,
    );
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    violations.push("Password must include an uppercase letter.");
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    violations.push("Password must include a lowercase letter.");
  }

  if (policy.requireNumber && !/[0-9]/.test(password)) {
    violations.push("Password must include a number.");
  }

  if (policy.requireSpecialCharacter && !/[^A-Za-z0-9]/.test(password)) {
    violations.push("Password must include a special character.");
  }

  return violations;
}

export function assertPasswordPolicy(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): void {
  const violations = validatePasswordAgainstPolicy(password, policy);

  if (violations.length > 0) {
    throw new Error(violations.join(" "));
  }
}
