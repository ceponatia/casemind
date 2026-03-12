import { provisionPostgresApplicationRole } from "../postgres/index.js";
import { getLocalServices, runPrismaCommand } from "./common.js";

async function main(): Promise<void> {
  const services = getLocalServices();
  runPrismaCommand(["generate"], services.postgresUrl);
  runPrismaCommand(["migrate", "deploy"], services.postgresUrl);
  await provisionPostgresApplicationRole(
    services.postgresUrl,
    services.postgresApp,
  );
}

void main();
