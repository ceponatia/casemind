import type {
  CredentialsProviderDefinition,
  LoginInput,
  LoginResult,
} from "../types.js";
import { AuthService } from "../service/auth-service.js";

export function createCredentialsProvider(
  authService: AuthService,
): CredentialsProviderDefinition {
  return {
    id: "credentials",
    type: "credentials",
    authorize(input: LoginInput): Promise<LoginResult> {
      return authService.login(input);
    },
  };
}
