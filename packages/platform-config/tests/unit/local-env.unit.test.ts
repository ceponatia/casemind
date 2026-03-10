import { describe, expect, it } from "vitest";

import { getLocalPlatformConfig } from "../../src/index.js";

describe("getLocalPlatformConfig", () => {
  it("returns the local development defaults", () => {
    const config = getLocalPlatformConfig({});

    expect(config.stack.stage).toBe("dev");
    expect(config.stack.vpcCidr).toBe("10.20.0.0/16");
    expect(config.services.postgresUrl).toBe(
      "postgresql://casemind:casemind@localhost:5432/casemind",
    );
    expect(config.services.objectStorage.buckets.documents).toBe(
      "casemind-documents-dev",
    );
  });

  it("respects explicit environment overrides", () => {
    const config = getLocalPlatformConfig({
      CASEMIND_STAGE: "staging",
      CASEMIND_POSTGRES_URL: "postgresql://custom",
      CASEMIND_OBJECT_STORAGE_FORCE_PATH_STYLE: "false",
      CASEMIND_LOG_RETENTION_DAYS: "30",
    });

    expect(config.stack.stage).toBe("staging");
    expect(config.stack.logRetentionDays).toBe(30);
    expect(config.services.postgresUrl).toBe("postgresql://custom");
    expect(config.services.objectStorage.forcePathStyle).toBe(false);
  });
});
