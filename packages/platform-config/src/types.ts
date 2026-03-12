export type DeploymentStage = "dev" | "staging" | "prod";

export interface TenantKeyStrategy {
  enablePerTenantKeys: boolean;
  aliasPrefix: string;
  rotationEnabled: boolean;
}

export interface AtlasConnectivityConfig {
  projectId: string;
  clusterName: string;
  region: string;
  enablePrivateConnectivity: boolean;
  allowedCidrs: string[];
  smokeTestUriSecretName: string;
}

export interface PlatformDataConfig {
  localObjectStorageEndpoint?: string;
  postgresInstanceClass: string;
  postgresStorageGb: number;
  postgresMultiAz: boolean;
  redisNodeType: string;
  redisTransitEncryption: boolean;
  redisAtRestEncryption: boolean;
}

export interface PlatformStackConfig {
  stage: DeploymentStage;
  awsRegion: string;
  vpcCidr: string;
  logRetentionDays: number;
  tenantKeyStrategy: TenantKeyStrategy;
  atlas: AtlasConnectivityConfig;
  data: PlatformDataConfig;
}

export interface LocalObjectStorageConfig {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
  buckets: {
    documents: string;
    evidence: string;
  };
}

export interface LocalPostgresApplicationRoleConfig {
  username: string;
  password: string;
}

export interface LocalPlatformServiceContract {
  stage: DeploymentStage;
  postgresUrl: string;
  postgresApp: LocalPostgresApplicationRoleConfig;
  mongodbUrl: string;
  redisUrl: string;
  objectStorage: LocalObjectStorageConfig;
  atlasSmokeTestUri?: string;
}

export interface LocalPlatformConfig {
  stack: PlatformStackConfig;
  services: LocalPlatformServiceContract;
}
