import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool, type PoolClient } from "pg";

import {
  createAuditLogCursor,
  normalizeAuditMetadata,
  parseAuditLogCursor,
  resolveAuditLogQueryLimit,
} from "../audit/index.js";
import type { RelationalRepository, RepositoryContext } from "../contracts.js";
import type {
  AiInteractionPlaceholder,
  AuditLogEntry,
  AuditLogQuery,
  AuditLogQueryResult,
  CalendarEvent,
  NewAiInteractionPlaceholder,
  NewAuditLogEntry,
  NewCalendarEvent,
  NewNotificationRecord,
  NewTenantRecord,
  NewUserRecord,
  NotificationRecord,
  TenantRecord,
  UserRecord,
} from "../types.js";

const MIGRATIONS_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "prisma",
  "migrations",
);

type PostgresRow = Record<string, unknown>;

export interface PostgresRoleCredentials {
  username: string;
  password: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function requireContext(context: RepositoryContext): void {
  if (context.tenantId.length === 0 || context.actorUserId.length === 0) {
    throw new Error("Repository context requires tenantId and actorUserId.");
  }
}

function normalizeTimestamp(
  value: Date | string | null | undefined,
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function parseJsonRecord(
  value: unknown,
): Record<string, string | number | boolean | null> {
  if (typeof value === "string") {
    return JSON.parse(value) as Record<
      string,
      string | number | boolean | null
    >;
  }

  if (typeof value === "object" && value !== null) {
    return value as Record<string, string | number | boolean | null>;
  }

  return {};
}

function readString(row: PostgresRow, key: string): string {
  const value = row[key];

  if (typeof value !== "string") {
    throw new Error(`Expected string value for ${key}.`);
  }

  return value;
}

function readOptionalString(row: PostgresRow, key: string): string | undefined {
  const value = row[key];

  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Expected optional string value for ${key}.`);
  }

  return value;
}

function readTimestamp(row: PostgresRow, key: string): string | undefined {
  return normalizeTimestamp(row[key] as Date | string | null | undefined);
}

function mapTenant(row: PostgresRow): TenantRecord {
  return {
    id: readString(row, "id"),
    slug: readString(row, "slug"),
    displayName: readString(row, "display_name"),
    createdAt: readTimestamp(row, "created_at") ?? nowIso(),
    updatedAt: readTimestamp(row, "updated_at") ?? nowIso(),
  };
}

function mapUser(row: PostgresRow): UserRecord {
  return {
    id: readString(row, "id"),
    tenantId: readString(row, "tenant_id"),
    email: readString(row, "email"),
    displayName: readString(row, "display_name"),
    role: readString(row, "role"),
    authProvider: readString(row, "auth_provider"),
    createdAt: readTimestamp(row, "created_at") ?? nowIso(),
    updatedAt: readTimestamp(row, "updated_at") ?? nowIso(),
  };
}

function mapAuditLogEntry(row: PostgresRow): AuditLogEntry {
  const actorUserId = readOptionalString(row, "actor_user_id");
  const resourceId = readOptionalString(row, "resource_id");
  const sourceIp = readOptionalString(row, "source_ip");
  const userAgent = readOptionalString(row, "user_agent");
  const deviceFingerprint = readOptionalString(row, "device_fingerprint");
  const justification = readOptionalString(row, "justification");
  const requestId = readOptionalString(row, "request_id");
  const correlationId = readOptionalString(row, "correlation_id");

  return {
    id: readString(row, "id"),
    tenantId: readString(row, "tenant_id"),
    ...(actorUserId === undefined ? {} : { actorUserId }),
    action: readString(row, "action") as AuditLogEntry["action"],
    outcome: readString(row, "outcome") as AuditLogEntry["outcome"],
    resourceType: readString(row, "resource_type"),
    ...(resourceId === undefined ? {} : { resourceId }),
    metadata: normalizeAuditMetadata(parseJsonRecord(row.metadata)),
    ...(sourceIp === undefined ? {} : { sourceIp }),
    ...(userAgent === undefined ? {} : { userAgent }),
    ...(deviceFingerprint === undefined ? {} : { deviceFingerprint }),
    ...(justification === undefined ? {} : { justification }),
    ...(requestId === undefined ? {} : { requestId }),
    ...(correlationId === undefined ? {} : { correlationId }),
    occurredAt: readTimestamp(row, "occurred_at") ?? nowIso(),
    createdAt: readTimestamp(row, "created_at") ?? nowIso(),
  };
}

function mapCalendarEvent(row: PostgresRow): CalendarEvent {
  const caseId = readOptionalString(row, "case_id");

  return {
    id: readString(row, "id"),
    tenantId: readString(row, "tenant_id"),
    ...(caseId === undefined ? {} : { caseId }),
    title: readString(row, "title"),
    startsAt: readTimestamp(row, "starts_at") ?? nowIso(),
    endsAt: readTimestamp(row, "ends_at") ?? nowIso(),
    createdAt: readTimestamp(row, "created_at") ?? nowIso(),
    updatedAt: readTimestamp(row, "updated_at") ?? nowIso(),
  };
}

function mapNotification(row: PostgresRow): NotificationRecord {
  const readAt = readTimestamp(row, "read_at");

  return {
    id: readString(row, "id"),
    tenantId: readString(row, "tenant_id"),
    userId: readString(row, "user_id"),
    title: readString(row, "title"),
    body: readString(row, "body"),
    severity: readString(row, "severity"),
    ...(readAt === undefined ? {} : { readAt }),
    createdAt: readTimestamp(row, "created_at") ?? nowIso(),
    updatedAt: readTimestamp(row, "updated_at") ?? nowIso(),
  };
}

function mapAiInteraction(row: PostgresRow): AiInteractionPlaceholder {
  const modelName = readOptionalString(row, "model_name");
  const promptTemplateId = readOptionalString(row, "prompt_template_id");

  return {
    id: readString(row, "id"),
    tenantId: readString(row, "tenant_id"),
    purpose: readString(row, "purpose"),
    status: readString(row, "status"),
    ...(modelName === undefined ? {} : { modelName }),
    ...(promptTemplateId === undefined ? {} : { promptTemplateId }),
    metadata: parseJsonRecord(row.metadata),
    requestedAt: readTimestamp(row, "requested_at") ?? nowIso(),
    createdAt: readTimestamp(row, "created_at") ?? nowIso(),
    updatedAt: readTimestamp(row, "updated_at") ?? nowIso(),
  };
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (row === undefined) {
    throw new Error(message);
  }

  return row;
}

function appendArrayFilter(
  clauses: string[],
  parameters: unknown[],
  column: string,
  filter: string | string[] | undefined,
): void {
  if (filter === undefined) {
    return;
  }

  const normalizedValues = (Array.isArray(filter) ? filter : [filter]).filter(
    (value) => value.length > 0,
  );

  if (normalizedValues.length === 0) {
    return;
  }

  parameters.push(normalizedValues);
  clauses.push(` AND ${column} = ANY($${parameters.length})`);
}

function appendScalarFilter(
  values: string[],
  parameters: unknown[],
  column: string,
  filter: string | undefined,
): void {
  if (filter === undefined) {
    return;
  }

  parameters.push(filter);
  values.push(` AND ${column} = $${parameters.length}`);
}

function quotePostgresIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function quotePostgresLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildApplicationRoleConnectionString(
  connectionString: string,
  credentials: PostgresRoleCredentials,
): string {
  const url = new URL(connectionString);
  url.username = credentials.username;
  url.password = credentials.password;
  return url.toString();
}

export async function provisionPostgresApplicationRole(
  connectionString: string,
  credentials: PostgresRoleCredentials,
): Promise<void> {
  const roleName = quotePostgresIdentifier(credentials.username);
  const password = quotePostgresLiteral(credentials.password);
  const pool = createPostgresPool(connectionString);
  const client = await connectWithRetry(pool);

  try {
    const existingRole = await client.query(
      "SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1",
      [credentials.username],
    );

    if (existingRole.rowCount === 0) {
      await client.query(
        `CREATE ROLE ${roleName} LOGIN PASSWORD ${password} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
      );
    } else {
      await client.query(
        `ALTER ROLE ${roleName} WITH LOGIN PASSWORD ${password} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
      );
    }

    await client.query(`GRANT USAGE ON SCHEMA public TO ${roleName}`);
    await client.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roleName}`,
    );
    await client.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${roleName}`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleName}`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${roleName}`,
    );
    await client.query(
      `REVOKE UPDATE, DELETE ON TABLE audit_log_entries FROM ${roleName}`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

export function createPostgresPool(connectionString: string): Pool {
  return new Pool({ connectionString });
}

async function connectWithRetry(pool: Pool): Promise<PoolClient> {
  const maxAttempts = 10;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await pool.connect();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      await sleep(250 * attempt);
    }
  }

  throw new Error("Unable to establish a PostgreSQL connection.");
}

export async function applyPostgresMigrations(
  connectionString: string,
): Promise<void> {
  const directories = readdirSync(MIGRATIONS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const pool = createPostgresPool(connectionString);
  const client = await connectWithRetry(pool);

  try {
    for (const directory of directories) {
      const sql = readFileSync(
        join(MIGRATIONS_ROOT, directory, "migration.sql"),
        "utf8",
      );
      await client.query(sql);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

export class PostgresRelationalRepository implements RelationalRepository {
  public constructor(private readonly pool: Pool) {}

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async createTenant(
    context: RepositoryContext,
    input: NewTenantRecord,
  ): Promise<TenantRecord> {
    const tenantId = input.id ?? context.tenantId;

    if (tenantId !== context.tenantId) {
      throw new Error(
        "Tenant bootstrap must match the repository context tenantId.",
      );
    }

    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        `
          INSERT INTO tenants (id, slug, display_name)
          VALUES ($1, $2, $3)
          ON CONFLICT (id) DO UPDATE
            SET slug = EXCLUDED.slug,
                display_name = EXCLUDED.display_name,
                updated_at = NOW()
          RETURNING *
        `,
        [tenantId, input.slug, input.displayName],
      );

      return mapTenant(
        requireRow(
          result.rows[0] as PostgresRow | undefined,
          "Failed to create tenant.",
        ),
      );
    });
  }

  public async getTenant(
    context: RepositoryContext,
  ): Promise<TenantRecord | null> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query("SELECT * FROM tenants WHERE id = $1", [
        context.tenantId,
      ]);
      return result.rows[0] === undefined
        ? null
        : mapTenant(result.rows[0] as PostgresRow);
    });
  }

  public async createUser(
    context: RepositoryContext,
    input: NewUserRecord,
  ): Promise<UserRecord> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        `
          INSERT INTO users (
            id,
            tenant_id,
            email,
            display_name,
            role,
            auth_provider
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [
          input.id ?? randomUUID(),
          context.tenantId,
          input.email,
          input.displayName,
          input.role,
          input.authProvider,
        ],
      );

      return mapUser(
        requireRow(
          result.rows[0] as PostgresRow | undefined,
          "Failed to create user.",
        ),
      );
    });
  }

  public async listUsers(context: RepositoryContext): Promise<UserRecord[]> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        "SELECT * FROM users WHERE tenant_id = $1 ORDER BY email ASC",
        [context.tenantId],
      );
      return result.rows.map((row) => mapUser(row as PostgresRow));
    });
  }

  public async appendAuditLog(
    context: RepositoryContext,
    input: NewAuditLogEntry,
  ): Promise<AuditLogEntry> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        `
          INSERT INTO audit_log_entries (
            id,
            tenant_id,
            actor_user_id,
            action,
            outcome,
            resource_type,
            resource_id,
            metadata,
            source_ip,
            user_agent,
            device_fingerprint,
            justification,
            request_id,
            correlation_id,
            occurred_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8::jsonb,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15
          )
          RETURNING *
        `,
        [
          input.id ?? randomUUID(),
          context.tenantId,
          input.actorUserId ?? null,
          input.action,
          input.outcome ?? "succeeded",
          input.resourceType,
          input.resourceId ?? null,
          JSON.stringify(normalizeAuditMetadata(input.metadata)),
          input.sourceIp ?? null,
          input.userAgent ?? null,
          input.deviceFingerprint ?? null,
          input.justification ?? null,
          input.requestId ?? null,
          input.correlationId ?? null,
          input.occurredAt ?? nowIso(),
        ],
      );

      return mapAuditLogEntry(
        requireRow(
          result.rows[0] as PostgresRow | undefined,
          "Failed to append audit log entry.",
        ),
      );
    });
  }

  public async listAuditLogEntries(
    context: RepositoryContext,
  ): Promise<AuditLogEntry[]> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        `
          SELECT *
          FROM audit_log_entries
          WHERE tenant_id = $1
          ORDER BY occurred_at DESC, id DESC
        `,
        [context.tenantId],
      );
      return result.rows.map((row) => mapAuditLogEntry(row as PostgresRow));
    });
  }

  public async queryAuditLogEntries(
    context: RepositoryContext,
    query: AuditLogQuery,
  ): Promise<AuditLogQueryResult> {
    return this.withTenantClient(context, async (client) => {
      const parameters: unknown[] = [context.tenantId];
      const whereClauses = ["tenant_id = $1"];
      const extraClauses: string[] = [];
      const limit = resolveAuditLogQueryLimit(query);

      appendArrayFilter(extraClauses, parameters, "action", query.action);
      appendArrayFilter(extraClauses, parameters, "outcome", query.outcome);
      appendScalarFilter(
        extraClauses,
        parameters,
        "resource_type",
        query.resourceType,
      );
      appendScalarFilter(
        extraClauses,
        parameters,
        "resource_id",
        query.resourceId,
      );
      appendScalarFilter(
        extraClauses,
        parameters,
        "actor_user_id",
        query.actorUserId,
      );

      if (query.fromOccurredAt !== undefined) {
        parameters.push(query.fromOccurredAt);
        extraClauses.push(` AND occurred_at >= $${parameters.length}`);
      }

      if (query.toOccurredAt !== undefined) {
        parameters.push(query.toOccurredAt);
        extraClauses.push(` AND occurred_at <= $${parameters.length}`);
      }

      if (query.cursor !== undefined) {
        const cursor = parseAuditLogCursor(query.cursor);
        parameters.push(cursor.occurredAt, cursor.id);
        extraClauses.push(
          ` AND (occurred_at < $${parameters.length - 1} OR (occurred_at = $${parameters.length - 1} AND id < $${parameters.length}))`,
        );
      }

      parameters.push(limit + 1);

      const result = await client.query(
        `
          SELECT *
          FROM audit_log_entries
          WHERE ${whereClauses.join(" AND ")}${extraClauses.join("")}
          ORDER BY occurred_at DESC, id DESC
          LIMIT $${parameters.length}
        `,
        parameters,
      );
      const entries = result.rows
        .slice(0, limit)
        .map((row) => mapAuditLogEntry(row as PostgresRow));
      const nextCursor =
        result.rows.length > limit
          ? createAuditLogCursor(entries[entries.length - 1] as AuditLogEntry)
          : undefined;

      return {
        entries,
        ...(nextCursor === undefined ? {} : { nextCursor }),
      };
    });
  }

  public async createCalendarEvent(
    context: RepositoryContext,
    input: NewCalendarEvent,
  ): Promise<CalendarEvent> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        `
          INSERT INTO calendar_events (
            id,
            tenant_id,
            case_id,
            title,
            starts_at,
            ends_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [
          input.id ?? randomUUID(),
          context.tenantId,
          input.caseId ?? null,
          input.title,
          input.startsAt,
          input.endsAt,
        ],
      );

      return mapCalendarEvent(
        requireRow(
          result.rows[0] as PostgresRow | undefined,
          "Failed to create calendar event.",
        ),
      );
    });
  }

  public async listCalendarEvents(
    context: RepositoryContext,
  ): Promise<CalendarEvent[]> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        "SELECT * FROM calendar_events WHERE tenant_id = $1 ORDER BY starts_at ASC",
        [context.tenantId],
      );
      return result.rows.map((row) => mapCalendarEvent(row as PostgresRow));
    });
  }

  public async createNotification(
    context: RepositoryContext,
    input: NewNotificationRecord,
  ): Promise<NotificationRecord> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        `
          INSERT INTO notifications (
            id,
            tenant_id,
            user_id,
            title,
            body,
            severity,
            read_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `,
        [
          input.id ?? randomUUID(),
          context.tenantId,
          input.userId,
          input.title,
          input.body,
          input.severity,
          input.readAt ?? null,
        ],
      );

      return mapNotification(
        requireRow(
          result.rows[0] as PostgresRow | undefined,
          "Failed to create notification.",
        ),
      );
    });
  }

  public async listNotifications(
    context: RepositoryContext,
  ): Promise<NotificationRecord[]> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        "SELECT * FROM notifications WHERE tenant_id = $1 ORDER BY created_at DESC",
        [context.tenantId],
      );
      return result.rows.map((row) => mapNotification(row as PostgresRow));
    });
  }

  public async createAiInteractionPlaceholder(
    context: RepositoryContext,
    input: NewAiInteractionPlaceholder,
  ): Promise<AiInteractionPlaceholder> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        `
          INSERT INTO ai_interaction_placeholders (
            id,
            tenant_id,
            purpose,
            status,
            model_name,
            prompt_template_id,
            metadata,
            requested_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
          RETURNING *
        `,
        [
          input.id ?? randomUUID(),
          context.tenantId,
          input.purpose,
          input.status,
          input.modelName ?? null,
          input.promptTemplateId ?? null,
          JSON.stringify(input.metadata),
          input.requestedAt ?? nowIso(),
        ],
      );

      return mapAiInteraction(
        requireRow(
          result.rows[0] as PostgresRow | undefined,
          "Failed to create AI interaction placeholder.",
        ),
      );
    });
  }

  public async listAiInteractionPlaceholders(
    context: RepositoryContext,
  ): Promise<AiInteractionPlaceholder[]> {
    return this.withTenantClient(context, async (client) => {
      const result = await client.query(
        `
          SELECT *
          FROM ai_interaction_placeholders
          WHERE tenant_id = $1
          ORDER BY requested_at DESC
        `,
        [context.tenantId],
      );
      return result.rows.map((row) => mapAiInteraction(row as PostgresRow));
    });
  }

  private async withTenantClient<T>(
    context: RepositoryContext,
    action: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    requireContext(context);
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('app.current_tenant_id', $1, true)",
        [context.tenantId],
      );
      await client.query(
        "SELECT set_config('app.current_actor_user_id', $1, true)",
        [context.actorUserId],
      );
      const result = await action(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
