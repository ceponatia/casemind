import {
  type DeploymentStage,
  type LocalPlatformConfig,
  type LocalPlatformServiceContract,
  type PlatformStackConfig,
} from "./types.js";

const DEFAULT_STAGE: DeploymentStage = "dev";
type EnvironmentMap = Record<string, string | undefined>;

function getDefaultEnv(): EnvironmentMap {
  return (
    (globalThis as { process?: { env?: EnvironmentMap } }).process?.env ?? {}
  );
}

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.length === 0) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected numeric environment value, received: ${value}`);
  }

  return parsed;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.length === 0) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function readStage(value: string | undefined): DeploymentStage {
  if (value === undefined || value.length === 0) {
    return DEFAULT_STAGE;
  }

  if (value === "dev" || value === "staging" || value === "prod") {
    return value;
  }

  throw new Error(`Unsupported CASEMIND_STAGE: ${value}`);
}

function readRequired(
  value: string | undefined,
  name: string,
  fallback?: string,
): string {
  const resolved = value ?? fallback;

  if (resolved === undefined || resolved.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return resolved;
}

export function getPlatformStackConfig(
  env: EnvironmentMap = getDefaultEnv(),
): PlatformStackConfig {
  return {
    stage: readStage(env.CASEMIND_STAGE),
    awsRegion: readRequired(
      env.CASEMIND_AWS_REGION,
      "CASEMIND_AWS_REGION",
      "us-gov-west-1",
    ),
    vpcCidr: readRequired(
      env.CASEMIND_VPC_CIDR,
      "CASEMIND_VPC_CIDR",
      "10.20.0.0/16",
    ),
    logRetentionDays: readNumber(env.CASEMIND_LOG_RETENTION_DAYS, 365),
    tenantKeyStrategy: {
      enablePerTenantKeys: true,
      aliasPrefix: "alias/casemind",
      rotationEnabled: true,
    },
    atlas: {
      projectId: env.CASEMIND_ATLAS_PROJECT_ID ?? "local-placeholder",
      clusterName: env.CASEMIND_ATLAS_CLUSTER_NAME ?? "casemind-local",
      region: env.CASEMIND_ATLAS_REGION ?? "us-gov-west-1",
      enablePrivateConnectivity: false,
      allowedCidrs: ["127.0.0.1/32"],
      smokeTestUriSecretName:
        env.CASEMIND_ATLAS_SMOKE_TEST_SECRET_NAME ??
        "casemind/atlas/smoke-test-uri",
    },
    data: {
      localObjectStorageEndpoint:
        env.CASEMIND_OBJECT_STORAGE_ENDPOINT ?? "http://localhost:9000",
      postgresInstanceClass:
        env.CASEMIND_POSTGRES_INSTANCE_CLASS ?? "db.t4g.small",
      postgresStorageGb: readNumber(env.CASEMIND_POSTGRES_STORAGE_GB, 100),
      postgresMultiAz: readBoolean(env.CASEMIND_POSTGRES_MULTI_AZ, true),
      redisNodeType: env.CASEMIND_REDIS_NODE_TYPE ?? "cache.t4g.small",
      redisTransitEncryption: true,
      redisAtRestEncryption: true,
    },
  };
}

export function getLocalPlatformServiceContract(
  env: EnvironmentMap = getDefaultEnv(),
): LocalPlatformServiceContract {
  const atlasSmokeTestUri = env.CASEMIND_ATLAS_SMOKE_TEST_URI;

  return {
    stage: readStage(env.CASEMIND_STAGE),
    postgresUrl: readRequired(
      env.CASEMIND_POSTGRES_URL,
      "CASEMIND_POSTGRES_URL",
      "postgresql://casemind:casemind@localhost:5432/casemind",
    ),
    mongodbUrl: readRequired(
      env.CASEMIND_MONGODB_URL,
      "CASEMIND_MONGODB_URL",
      "mongodb://localhost:27017/casemind",
    ),
    redisUrl: readRequired(
      env.CASEMIND_REDIS_URL,
      "CASEMIND_REDIS_URL",
      "redis://localhost:6380",
    ),
    objectStorage: {
      endpoint: readRequired(
        env.CASEMIND_OBJECT_STORAGE_ENDPOINT,
        "CASEMIND_OBJECT_STORAGE_ENDPOINT",
        "http://localhost:9000",
      ),
      region: readRequired(
        env.CASEMIND_OBJECT_STORAGE_REGION,
        "CASEMIND_OBJECT_STORAGE_REGION",
        "us-east-1",
      ),
      accessKey: readRequired(
        env.CASEMIND_OBJECT_STORAGE_ACCESS_KEY,
        "CASEMIND_OBJECT_STORAGE_ACCESS_KEY",
        "minioadmin",
      ),
      secretKey: readRequired(
        env.CASEMIND_OBJECT_STORAGE_SECRET_KEY,
        "CASEMIND_OBJECT_STORAGE_SECRET_KEY",
        "minioadmin",
      ),
      forcePathStyle: readBoolean(
        env.CASEMIND_OBJECT_STORAGE_FORCE_PATH_STYLE,
        true,
      ),
      buckets: {
        documents: readRequired(
          env.CASEMIND_DOCUMENTS_BUCKET,
          "CASEMIND_DOCUMENTS_BUCKET",
          "casemind-documents-dev",
        ),
        evidence: readRequired(
          env.CASEMIND_EVIDENCE_BUCKET,
          "CASEMIND_EVIDENCE_BUCKET",
          "casemind-evidence-dev",
        ),
      },
    },
    ...(atlasSmokeTestUri === undefined ? {} : { atlasSmokeTestUri }),
  };
}

export function getLocalPlatformConfig(
  env: EnvironmentMap = getDefaultEnv(),
): LocalPlatformConfig {
  return {
    stack: getPlatformStackConfig(env),
    services: getLocalPlatformServiceContract(env),
  };
}
