import type {
  CreateLocalUserInput,
  LocalAuthConfig,
  LocalUserAccount,
} from "../types.js";
import { createLocalUserAccount } from "./in-memory-user-directory.js";

export const DEFAULT_SYNTHETIC_PASSWORD = "CaseMindLocal!23";
export const DEFAULT_SYNTHETIC_TENANT_ID = "tenant-local-demo";

const DEFAULT_SYNTHETIC_USER_BLUEPRINTS: ReadonlyArray<
  Omit<CreateLocalUserInput, "password" | "tenantId">
> = [
  {
    userId: "usr-office-admin",
    email: "office.admin@local.casemind.test",
    displayName: "Office Admin (Synthetic)",
    roleIds: ["office-admin"],
  },
  {
    userId: "usr-division-chief",
    email: "division.chief@local.casemind.test",
    displayName: "Division Chief (Synthetic)",
    roleIds: ["division-chief"],
  },
  {
    userId: "usr-apa",
    email: "apa@local.casemind.test",
    displayName: "Assistant Prosecuting Attorney (Synthetic)",
    roleIds: ["apa"],
  },
  {
    userId: "usr-juvenile-apa",
    email: "juvenile.apa@local.casemind.test",
    displayName: "Juvenile APA (Synthetic)",
    roleIds: ["juvenile-apa"],
  },
  {
    userId: "usr-victim-advocate",
    email: "victim.advocate@local.casemind.test",
    displayName: "Victim Advocate (Synthetic)",
    roleIds: ["victim-advocate"],
  },
  {
    userId: "usr-legal-assistant",
    email: "legal.assistant@local.casemind.test",
    displayName: "Legal Assistant (Synthetic)",
    roleIds: ["legal-assistant"],
  },
  {
    userId: "usr-read-only",
    email: "read.only@local.casemind.test",
    displayName: "Read Only User (Synthetic)",
    roleIds: ["read-only"],
  },
];

export function createSyntheticLocalAccounts(
  config?: Pick<LocalAuthConfig, "syntheticPassword" | "syntheticTenantId">,
): LocalUserAccount[] {
  const syntheticPassword =
    config?.syntheticPassword ?? DEFAULT_SYNTHETIC_PASSWORD;
  const syntheticTenantId =
    config?.syntheticTenantId ?? DEFAULT_SYNTHETIC_TENANT_ID;

  return DEFAULT_SYNTHETIC_USER_BLUEPRINTS.map((blueprint) =>
    createLocalUserAccount({
      ...blueprint,
      tenantId: syntheticTenantId,
      password: syntheticPassword,
    }),
  );
}
