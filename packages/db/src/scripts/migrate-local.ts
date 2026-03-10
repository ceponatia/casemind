import { getLocalServices, runPrismaCommand } from "./common.js";

function main(): void {
  const services = getLocalServices();
  runPrismaCommand(["generate"], services.postgresUrl);
  runPrismaCommand(["migrate", "deploy"], services.postgresUrl);
}

main();
