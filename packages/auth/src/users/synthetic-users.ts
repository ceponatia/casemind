import type {
  CreateLocalUserInput,
  LocalAuthConfig,
  LocalUserAccount,
} from "../types.js";
import {
  ROLE_IDS,
  type RoleId,
} from "@casemind/rbac";
import { createLocalUserAccount } from "./in-memory-user-directory.js";

export const DEFAULT_SYNTHETIC_PASSWORD = "CaseMindLocal!23";
export const DEFAULT_SYNTHETIC_TENANT_ID = "tenant-local-demo";

const [
  OFFICE_ADMIN_ROLE_ID,
  DIVISION_CHIEF_ROLE_ID,
  APA_ROLE_ID,
  JUVENILE_APA_ROLE_ID,
  VICTIM_ADVOCATE_ROLE_ID,
  LEGAL_ASSISTANT_ROLE_ID,
  READ_ONLY_ROLE_ID,
] = ROLE_IDS satisfies readonly RoleId[];

const DEFAULT_SYNTHETIC_USER_BLUEPRINTS: ReadonlyArray<
  Omit<CreateLocalUserInput, "password" | "tenantId">
> = [
  {
    userId: "usr-office-admin",
    email: "office.admin@local.casemind.test",
    displayName: "Office Admin (Synthetic)",
    roleIds: [OFFICE_ADMIN_ROLE_ID],
  },
  {
    userId: "usr-division-chief",
    email: "division.chief@local.casemind.test",
    displayName: "Division Chief (Synthetic)",
    roleIds: [DIVISION_CHIEF_ROLE_ID],
  },
  {
    userId: "usr-apa",
    email: "apa@local.casemind.test",
    displayName: "Assistant Prosecuting Attorney (Synthetic)",
    roleIds: [APA_ROLE_ID],
  },
  {
    userId: "usr-juvenile-apa",
    email: "juvenile.apa@local.casemind.test",
    displayName: "Juvenile APA (Synthetic)",
    roleIds: [JUVENILE_APA_ROLE_ID],
  },
  {
    userId: "usr-victim-advocate",
    email: "victim.advocate@local.casemind.test",
    displayName: "Victim Advocate (Synthetic)",
    roleIds: [VICTIM_ADVOCATE_ROLE_ID],
  },
  {
    userId: "usr-legal-assistant",
    email: "legal.assistant@local.casemind.test",
    displayName: "Legal Assistant (Synthetic)",
    roleIds: [LEGAL_ASSISTANT_ROLE_ID],
  },
  {
    userId: "usr-read-only",
    email: "read.only@local.casemind.test",
    displayName: "Read Only User (Synthetic)",
    roleIds: [READ_ONLY_ROLE_ID],
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
