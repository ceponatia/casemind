ALTER TABLE audit_log_entries RENAME TO audit_log_entries_legacy;

CREATE TABLE IF NOT EXISTS audit_log_entries (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'succeeded',
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_ip TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  justification TEXT,
  request_id TEXT,
  correlation_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE IF NOT EXISTS audit_log_entries_default
  PARTITION OF audit_log_entries DEFAULT;

CREATE OR REPLACE FUNCTION casemind_create_audit_log_month_partition(month_start DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  partition_start DATE := date_trunc('month', month_start)::date;
  partition_end DATE := (partition_start + INTERVAL '1 month')::date;
  partition_name TEXT := format(
    'audit_log_entries_%s',
    to_char(partition_start, 'YYYY_MM')
  );
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_log_entries FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    partition_start,
    partition_end
  );
END;
$$;

DO $$
DECLARE
  start_month DATE := (date_trunc('month', current_date) - INTERVAL '12 months')::date;
  month_offset INTEGER;
BEGIN
  FOR month_offset IN 0..24 LOOP
    PERFORM casemind_create_audit_log_month_partition(
      (start_month + ((month_offset || ' month')::interval))::date
    );
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS audit_log_entries_tenant_occurred_idx
  ON audit_log_entries (tenant_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS audit_log_entries_tenant_resource_idx
  ON audit_log_entries (tenant_id, resource_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entries_tenant_actor_idx
  ON audit_log_entries (tenant_id, actor_user_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION casemind_prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log_entries is append-only';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_entries_append_only ON audit_log_entries;
CREATE TRIGGER audit_log_entries_append_only
  BEFORE UPDATE OR DELETE ON audit_log_entries
  FOR EACH ROW
  EXECUTE FUNCTION casemind_prevent_audit_log_mutation();

ALTER TABLE audit_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_entries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_entries_tenant_isolation ON audit_log_entries;
CREATE POLICY audit_log_entries_tenant_isolation ON audit_log_entries
  USING (tenant_id = casemind_current_tenant_id())
  WITH CHECK (tenant_id = casemind_current_tenant_id());

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
  occurred_at,
  created_at
)
SELECT
  id,
  tenant_id,
  NULLIF(actor_user_id, ''),
  CASE
    WHEN action LIKE '%.view' OR action = 'view' THEN 'view'
    WHEN action LIKE '%.create' OR action = 'create' THEN 'create'
    WHEN action LIKE '%.update' OR action = 'update' THEN 'update'
    WHEN action LIKE '%.delete' OR action = 'delete' THEN 'delete'
    WHEN action LIKE '%.export' OR action = 'export' THEN 'export'
    WHEN action LIKE 'auth.login%' OR action = 'login' THEN 'login'
    WHEN action LIKE 'auth.logout%' OR action = 'logout' THEN 'logout'
    WHEN action = 'break_glass' THEN 'break_glass'
    ELSE 'update'
  END,
  'succeeded',
  entity_type,
  NULLIF(entity_id, ''),
  COALESCE(detail, '{}'::jsonb),
  source_ip,
  occurred_at,
  created_at
FROM audit_log_entries_legacy;

DROP TABLE audit_log_entries_legacy;