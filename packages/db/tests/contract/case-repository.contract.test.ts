import { startMongoTestInstance } from "@casemind/test-utils";

import {
  InMemoryCaseRepository,
  MongoCaseRepository,
  applyMongoIndexes,
  connectMongoDatabase,
  runCaseRepositoryContractSuite,
} from "../../src/index.js";

runCaseRepositoryContractSuite("in-memory", () =>
  Promise.resolve({
    repository: new InMemoryCaseRepository(),
    primaryContext: {
      tenantId: "tenant-a",
      actorUserId: "actor-a",
    },
    secondaryContext: {
      tenantId: "tenant-b",
      actorUserId: "actor-b",
    },
    cleanup: async () => {},
  }),
);

runCaseRepositoryContractSuite("mongo", async () => {
  const instance = await startMongoTestInstance({
    databaseName: "casemind_contract",
  });
  const connection = await connectMongoDatabase(instance.connectionString);
  await applyMongoIndexes(connection.database);

  return {
    repository: new MongoCaseRepository(connection.database),
    primaryContext: {
      tenantId: "tenant-a",
      actorUserId: "actor-a",
    },
    secondaryContext: {
      tenantId: "tenant-b",
      actorUserId: "actor-b",
    },
    cleanup: async () => {
      await connection.client.close();
      await instance.stop();
    },
  };
});
