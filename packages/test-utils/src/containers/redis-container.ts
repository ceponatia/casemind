import { GenericContainer, Wait } from "testcontainers";

export interface RedisTestInstance {
  connectionString: string;
  stop(): Promise<void>;
}

export interface RedisTestInstanceOptions {
  image?: string;
}

export function buildRedisConnectionString(host: string, port: number): string {
  return `redis://${host}:${port}`;
}

export async function startRedisTestInstance(
  options: RedisTestInstanceOptions = {},
): Promise<RedisTestInstance> {
  const container = await new GenericContainer(
    options.image ?? "redis:7-alpine",
  )
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
    .start();

  return {
    connectionString: buildRedisConnectionString(
      container.getHost(),
      container.getMappedPort(6379),
    ),
    stop: async () => {
      await container.stop();
    },
  };
}
