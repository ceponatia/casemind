import { applyMongoIndexes, connectMongoDatabase } from "../mongo/index.js";
import { getLocalServices } from "./common.js";

async function main(): Promise<void> {
  const services = getLocalServices();
  const connection = await connectMongoDatabase(services.mongodbUrl);

  try {
    await applyMongoIndexes(connection.database);
  } finally {
    await connection.client.close();
  }
}

void main();
