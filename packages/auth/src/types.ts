export type AuthProviderType = "credentials" | "oidc" | "saml";

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  roleIds: string[];
  mfaEnabled: boolean;
  accountLocked: boolean;
}

export interface SessionPolicy {
  inactivityTimeoutMinutes: number;
  absoluteTimeoutHours: number;
  maxFailedAttempts: number;
  secureCookies: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialCharacter: boolean;
}

export interface TotpEnrollmentState {
  userId: string;
  secretRef: string;
  recoveryCodeHashes: string[];
  enrolledAt?: string;
  verifiedAt?: string;
}

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionPrincipal {
  userId: string;
  tenantId: string;
  roleIds: string[];
}

export interface AuthSession extends SessionPrincipal, SessionMetadata {
  sessionId: string;
  sessionToken: string;
  issuedAt: string;
  lastActivityAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
}

export interface CreateLocalUserInput {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  roleIds: string[];
  password: string;
}

export interface LocalUserAccount extends AuthenticatedUser {
  passwordHash: string;
  accountActive: boolean;
  failedAttempts: number;
  mfaEnrollment?: TotpEnrollmentState;
}

export interface LocalAuthConfig {
  issuer: string;
  sessionSecret: string;
  sessionCookieName: string;
  sessionPolicy: SessionPolicy;
  syntheticTenantId: string;
  syntheticPassword: string;
}

export interface AuthAuditEvent {
  type:
    | "auth.login.succeeded"
    | "auth.login.failed"
    | "auth.login.mfa_required"
    | "auth.mfa.enrollment.started"
    | "auth.mfa.enrollment.activated"
    | "auth.mfa.reset"
    | "auth.lockout.reset"
    | "auth.password.updated"
    | "auth.account.deactivated"
    | "auth.session.invalidated";
  occurredAt: string;
  userId?: string;
  tenantId?: string;
  email?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

export interface AuthAuditSink {
  record(event: AuthAuditEvent): void | Promise<void>;
}

export interface OidcProviderConfig {
  type: "oidc";
  providerId: string;
  issuerUrl: string;
  clientId: string;
  clientSecretRef: string;
  tenantClaimPath?: string;
}

export interface SamlProviderConfig {
  type: "saml";
  providerId: string;
  entryPoint: string;
  certificateRef: string;
  audience: string;
  issuer: string;
  tenantAttribute?: string;
}

export type FutureSsoProviderConfig = OidcProviderConfig | SamlProviderConfig;

export type PrimaryAuthenticationResult =
  | {
      status: "success";
      user: AuthenticatedUser;
    }
  | {
      status: "invalid_credentials" | "account_locked" | "account_inactive";
    };

export interface LoginInput extends SessionMetadata {
  email: string;
  password: string;
  totpCode?: string;
  recoveryCode?: string;
  now?: Date;
}

export type LoginResult =
  | {
      status: "success";
      user: AuthenticatedUser;
      session: AuthSession;
    }
  | {
      status: "mfa_required";
      user: AuthenticatedUser;
    }
  | {
      status: "invalid_credentials" | "account_locked" | "account_inactive";
    };

export interface TotpEnrollmentStart {
  state: TotpEnrollmentState;
  secret: string;
  otpauthUri: string;
}

export interface TotpEnrollmentActivation {
  state: TotpEnrollmentState;
  recoveryCodes: string[];
}

export interface CredentialsProviderDefinition {
  id: "credentials";
  type: "credentials";
  authorize(input: LoginInput): Promise<LoginResult>;
}
