import type {
  CredentialsProviderDefinition,
  LoginInput,
  LoginResult,
} from "../types.js";

interface AuthServiceLike {
  login(input: LoginInput): Promise<LoginResult>;
}

export function createCredentialsProvider(
  authService: AuthServiceLike,
): CredentialsProviderDefinition {
  return {
    id: "credentials",
    type: "credentials",
    authorize(input: LoginInput): Promise<LoginResult> {
      return authService.login(input);
    },
  };
}
