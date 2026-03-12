import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool, type PoolClient } from "pg";

import type { RelationalRepository, RepositoryContext } from "../contracts.js";
import type {
  AiInteractionPlaceholder,
  AuditLogEntry,
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

function parseJsonRecord(value: unknown): Record<string, string> {
  if (typeof value === "string") {
    return JSON.parse(value) as Record<string, string>;
  }

  if (typeof value === "object" && value !== null) {
    return value as Record<string, string>;
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
  const sourceIp = readOptionalString(row, "source_ip");

  return {
    id: readString(row, "id"),
    tenantId: readString(row, "tenant_id"),
    actorUserId: readString(row, "actor_user_id"),
    action: readString(row, "action"),
    entityType: readString(row, "entity_type"),
    entityId: readString(row, "entity_id"),
    detail: parseJsonRecord(row.detail),
    ...(sourceIp === undefined ? {} : { sourceIp }),
    occurredAt: readTimestamp(row, "occurred_at") ?? nowIso(),
    createdAt: readTimestamp(row, "created_at") ?? nowIso(),
    updatedAt: readTimestamp(row, "updated_at") ?? nowIso(),
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

export function buildApplicationRoleConnectionString(
  connectionString: string,
): string {
  const url = new URL(connectionString);
  url.username = "casemind_app";
  url.password = "casemind_app";
  return url.toString();
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
      const result = await client.query(
        "SELECT * FROM tenants WHERE id = $1",
        [context.tenantId],
      );
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
            entity_type,
            entity_id,
            detail,
            source_ip,
            occurred_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
          RETURNING *
        `,
        [
          input.id ?? randomUUID(),
          context.tenantId,
          input.actorUserId,
          input.action,
          input.entityType,
          input.entityId,
          JSON.stringify(input.detail),
          input.sourceIp ?? null,
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
        "SELECT * FROM audit_log_entries WHERE tenant_id = $1 ORDER BY occurred_at DESC",
        [context.tenantId],
      );
      return result.rows.map((row) => mapAuditLogEntry(row as PostgresRow));
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
