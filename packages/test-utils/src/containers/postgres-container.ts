import { GenericContainer, Wait } from "testcontainers";

export interface PostgresTestInstance {
  connectionString: string;
  stop(): Promise<void>;
}

export interface PostgresTestInstanceOptions {
  image?: string;
  database?: string;
  username?: string;
  password?: string;
}

export function buildPostgresConnectionString(
  host: string,
  port: number,
  database: string,
  username: string,
  password: string,
): string {
  return `postgresql://${username}:${password}@${host}:${port}/${database}`;
}

export async function startPostgresTestInstance(
  options: PostgresTestInstanceOptions = {},
): Promise<PostgresTestInstance> {
  const database = options.database ?? "casemind_test";
  const username = options.username ?? "casemind";
  const password = options.password ?? "casemind";
  const container = await new GenericContainer(
    options.image ?? "postgres:16-alpine",
  )
    .withEnvironment({
      POSTGRES_DB: database,
      POSTGRES_USER: username,
      POSTGRES_PASSWORD: password,
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage("database system is ready to accept connections"),
    )
    .start();

  return {
    connectionString: buildPostgresConnectionString(
      container.getHost(),
      container.getMappedPort(5432),
      database,
      username,
      password,
    ),
    stop: async () => {
      await container.stop();
    },
  };
}
