import type { RoleId } from "../types.js";

export interface RoleDefinition {
  id: RoleId;
  displayName: string;
  breakGlassEligible: boolean;
  domain: "shared" | "criminal" | "na" | "support";
}

export const ROLE_DEFINITIONS_BY_ID: Record<RoleId, RoleDefinition> = {
  "office-admin": {
    id: "office-admin",
    displayName: "Office Admin",
    breakGlassEligible: true,
    domain: "shared",
  },
  "division-chief": {
    id: "division-chief",
    displayName: "Division Chief",
    breakGlassEligible: true,
    domain: "shared",
  },
  apa: {
    id: "apa",
    displayName: "Assistant Prosecuting Attorney",
    breakGlassEligible: true,
    domain: "criminal",
  },
  "juvenile-apa": {
    id: "juvenile-apa",
    displayName: "Juvenile Division APA",
    breakGlassEligible: true,
    domain: "na",
  },
  "victim-advocate": {
    id: "victim-advocate",
    displayName: "Victim Advocate",
    breakGlassEligible: false,
    domain: "support",
  },
  "legal-assistant": {
    id: "legal-assistant",
    displayName: "Legal Assistant",
    breakGlassEligible: false,
    domain: "support",
  },
  "read-only": {
    id: "read-only",
    displayName: "Read-Only User",
    breakGlassEligible: false,
    domain: "support",
  },
};

export const ROLE_DEFINITIONS = Object.values(ROLE_DEFINITIONS_BY_ID);

export const BREAK_GLASS_ROLE_IDS = ROLE_DEFINITIONS.filter(
  (definition) => definition.breakGlassEligible,
).map((definition) => definition.id);