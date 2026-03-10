import { GenericContainer, Wait } from "testcontainers";

export interface MongoTestInstance {
  connectionString: string;
  databaseName: string;
  stop(): Promise<void>;
}

export interface MongoTestInstanceOptions {
  image?: string;
  databaseName?: string;
}

export function buildMongoConnectionString(
  host: string,
  port: number,
  databaseName: string,
): string {
  return `mongodb://${host}:${port}/${databaseName}`;
}

export async function startMongoTestInstance(
  options: MongoTestInstanceOptions = {},
): Promise<MongoTestInstance> {
  const databaseName = options.databaseName ?? "casemind_test";
  const container = await new GenericContainer(options.image ?? "mongo:7")
    .withExposedPorts(27017)
    .withWaitStrategy(Wait.forLogMessage("Waiting for connections"))
    .start();

  return {
    connectionString: buildMongoConnectionString(
      container.getHost(),
      container.getMappedPort(27017),
      databaseName,
    ),
    databaseName,
    stop: async () => {
      await container.stop();
    },
  };
}
