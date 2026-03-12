import { describe, expect, it } from "vitest";

import { startMongoTestInstance } from "@casemind/test-utils";

import {
  MongoCatalogRepository,
  MongoCaseRepository,
  MongoPersonRepository,
  applyMongoIndexes,
  connectMongoDatabase,
} from "../../../src/index.js";

describe("Mongo repositories", () => {
  it("creates tenant-scoped records and supports status aggregation", async () => {
    const instance = await startMongoTestInstance({
      databaseName: "casemind_integration",
    });
    const connection = await connectMongoDatabase(instance.connectionString);
    const context = {
      tenantId: "tenant-demo",
      actorUserId: "user-demo",
    };

    try {
      await applyMongoIndexes(connection.database);
      const people = new MongoPersonRepository(connection.database);
      const cases = new MongoCaseRepository(connection.database);
      const catalog = new MongoCatalogRepository(connection.database);

      const child = await people.createPerson(context, {
        id: "person-child-100",
        firstName: "Taylor",
        lastName: "Rivera",
        roleTags: ["child"],
        externalIdentifiers: ["P-100"],
      });

      const criminalCase = await cases.createCriminalCase(context, {
        id: "criminal-100",
        caseNumber: "2026-CR-100",
        status: "screening",
        court: "Circuit",
        defendantPersonIds: [child.id],
        victimPersonIds: [],
        chargeIds: ["charge-100"],
      });

      await catalog.createDocument(context, {
        id: "document-100",
        caseId: criminalCase.id,
        title: "Incident Report",
        documentType: "report",
        storageKey: "documents/report-100.pdf",
        classification: "cji",
      });
      await catalog.createEvidence(context, {
        id: "evidence-100",
        caseId: criminalCase.id,
        evidenceNumber: "EV-100",
        documentIds: ["document-100"],
        chainOfCustody: ["logged"],
        description: "Camera export",
      });

      const summary = await cases.summarizeCriminalCaseStatuses(context);
      const documents = await catalog.listDocumentsByCase(
        context,
        criminalCase.id,
      );
      const evidence = await catalog.listEvidenceByCase(
        context,
        criminalCase.id,
      );

      expect(summary).toEqual([{ status: "screening", count: 1 }]);
      expect(documents).toHaveLength(1);
      expect(evidence).toHaveLength(1);
    } finally {
      await connection.client.close();
      await instance.stop();
    }
  });
});
