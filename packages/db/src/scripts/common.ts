import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getLocalPlatformServiceContract } from "@casemind/platform-config";

export function getPackageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("Could not locate package root (no package.json found)");
    }
    dir = parent;
  }
  return dir;
}

export function getSchemaPath(): string {
  return join(getPackageRoot(), "prisma", "schema.prisma");
}

export function getLocalServices() {
  return getLocalPlatformServiceContract();
}

export function runPrismaCommand(args: string[], postgresUrl: string): void {
  const command = spawnSync(
    "pnpm",
    ["exec", "prisma", ...args, "--schema", getSchemaPath()],
    {
      cwd: getPackageRoot(),
      env: {
        ...process.env,
        DATABASE_URL: postgresUrl,
      },
      stdio: "inherit",
    },
  );

  if (command.status !== 0) {
    throw new Error(`Prisma command failed: ${args.join(" ")}`);
  }
}
