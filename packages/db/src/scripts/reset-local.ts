import {
  applyMongoIndexes,
  connectMongoDatabase,
  resetMongoDatabase,
} from "../mongo/index.js";
import {
  PostgresRelationalRepository,
  createPostgresPool,
} from "../postgres/index.js";
import { seedDeterministicLocalData } from "../seeds/index.js";
import {
  MongoCatalogRepository,
  MongoCaseRepository,
  MongoPersonRepository,
} from "../mongo/index.js";
import { getLocalServices, runPrismaCommand } from "./common.js";

async function main(): Promise<void> {
  const services = getLocalServices();

  runPrismaCommand(["migrate", "reset", "--force"], services.postgresUrl);

  const mongo = await connectMongoDatabase(services.mongodbUrl);
  const pool = createPostgresPool(services.postgresUrl);
  const relationalRepository = new PostgresRelationalRepository(pool);

  try {
    await resetMongoDatabase(mongo.database);
    await applyMongoIndexes(mongo.database);
    await seedDeterministicLocalData({
      relationalRepository,
      caseRepository: new MongoCaseRepository(mongo.database),
      personRepository: new MongoPersonRepository(mongo.database),
      catalogRepository: new MongoCatalogRepository(mongo.database),
    });
  } finally {
    await relationalRepository.close();
    await mongo.client.close();
  }
}

void main();
