import { describe, expect, it } from "vitest";

import {
  PERMISSION_MATRIX,
  RESOURCE_TYPES,
  ROLE_DEFINITIONS,
} from "../../src/index.js";

describe("PERMISSION_MATRIX", () => {
  it("defines permissions for every canonical role and resource", () => {
    for (const definition of ROLE_DEFINITIONS) {
      expect(PERMISSION_MATRIX[definition.id]).toBeDefined();

      for (const resourceType of RESOURCE_TYPES) {
        expect(PERMISSION_MATRIX[definition.id][resourceType]).toBeDefined();
      }
    }
  });

  it("keeps the foundational permission matrix stable", () => {
    expect(PERMISSION_MATRIX).toMatchInlineSnapshot(`
      {
        "apa": {
          "criminal_case": [
            "create",
            "read",
            "update",
            "export",
          ],
          "document": [
            "create",
            "read",
            "update",
            "export",
          ],
          "evidence": [
            "create",
            "read",
            "update",
            "export",
          ],
          "na_case": [],
          "person": [
            "create",
            "read",
            "update",
          ],
          "service_plan": [],
          "user": [],
        },
        "division-chief": {
          "criminal_case": [
            "create",
            "read",
            "update",
            "export",
          ],
          "document": [
            "create",
            "read",
            "update",
            "export",
          ],
          "evidence": [
            "create",
            "read",
            "update",
            "export",
          ],
          "na_case": [
            "create",
            "read",
            "update",
            "export",
          ],
          "person": [
            "create",
            "read",
            "update",
            "export",
          ],
          "service_plan": [
            "create",
            "read",
            "update",
            "export",
          ],
          "user": [
            "read",
          ],
        },
        "juvenile-apa": {
          "criminal_case": [],
          "document": [
            "create",
            "read",
            "update",
            "export",
          ],
          "evidence": [],
          "na_case": [
            "create",
            "read",
            "update",
            "export",
          ],
          "person": [
            "create",
            "read",
            "update",
          ],
          "service_plan": [
            "create",
            "read",
            "update",
            "export",
          ],
          "user": [],
        },
        "legal-assistant": {
          "criminal_case": [
            "create",
            "read",
            "update",
          ],
          "document": [
            "create",
            "read",
            "update",
          ],
          "evidence": [
            "create",
            "read",
            "update",
          ],
          "na_case": [
            "create",
            "read",
            "update",
          ],
          "person": [
            "create",
            "read",
            "update",
          ],
          "service_plan": [
            "create",
            "read",
            "update",
          ],
          "user": [],
        },
        "office-admin": {
          "criminal_case": [
            "create",
            "read",
            "update",
            "delete",
            "export",
          ],
          "document": [
            "create",
            "read",
            "update",
            "delete",
            "export",
          ],
          "evidence": [
            "create",
            "read",
            "update",
            "delete",
            "export",
          ],
          "na_case": [
            "create",
            "read",
            "update",
            "delete",
            "export",
          ],
          "person": [
            "create",
            "read",
            "update",
            "delete",
            "export",
          ],
          "service_plan": [
            "create",
            "read",
            "update",
            "delete",
            "export",
          ],
          "user": [
            "create",
            "read",
            "update",
            "delete",
            "export",
          ],
        },
        "read-only": {
          "criminal_case": [
            "read",
          ],
          "document": [
            "read",
          ],
          "evidence": [
            "read",
          ],
          "na_case": [
            "read",
          ],
          "person": [
            "read",
          ],
          "service_plan": [
            "read",
          ],
          "user": [],
        },
        "victim-advocate": {
          "criminal_case": [
            "read",
          ],
          "document": [
            "read",
          ],
          "evidence": [],
          "na_case": [],
          "person": [
            "read",
          ],
          "service_plan": [],
          "user": [],
        },
      }
    `);
  });
});