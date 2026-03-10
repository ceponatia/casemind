import {
  MongoCatalogRepository,
  MongoCaseRepository,
  MongoPersonRepository,
  connectMongoDatabase,
} from "../mongo/index.js";
import {
  PostgresRelationalRepository,
  createPostgresPool,
} from "../postgres/index.js";
import { seedDeterministicLocalData } from "../seeds/index.js";
import { getLocalServices } from "./common.js";

async function main(): Promise<void> {
  const services = getLocalServices();
  const pool = createPostgresPool(services.postgresUrl);
  const relationalRepository = new PostgresRelationalRepository(pool);
  const mongo = await connectMongoDatabase(services.mongodbUrl);
  const caseRepository = new MongoCaseRepository(mongo.database);
  const personRepository = new MongoPersonRepository(mongo.database);
  const catalogRepository = new MongoCatalogRepository(mongo.database);

  try {
    await seedDeterministicLocalData({
      relationalRepository,
      caseRepository,
      personRepository,
      catalogRepository,
    });
  } finally {
    await relationalRepository.close();
    await mongo.client.close();
  }
}

void main();
