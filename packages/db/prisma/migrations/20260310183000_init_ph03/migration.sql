CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  auth_provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_tenant_email_unique UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS audit_log_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_ip TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_interaction_placeholders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL,
  model_name TEXT,
  prompt_template_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_tenant_idx ON users (tenant_id);
CREATE INDEX IF NOT EXISTS audit_log_entries_tenant_occurred_idx ON audit_log_entries (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS calendar_events_tenant_starts_idx ON calendar_events (tenant_id, starts_at);
CREATE INDEX IF NOT EXISTS notifications_tenant_user_idx ON notifications (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS ai_interaction_placeholders_tenant_status_idx ON ai_interaction_placeholders (tenant_id, status);

CREATE OR REPLACE FUNCTION casemind_current_tenant_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '');
$$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_placeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_placeholders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = casemind_current_tenant_id())
  WITH CHECK (tenant_id = casemind_current_tenant_id());

DROP POLICY IF EXISTS audit_log_entries_tenant_isolation ON audit_log_entries;
CREATE POLICY audit_log_entries_tenant_isolation ON audit_log_entries
  USING (tenant_id = casemind_current_tenant_id())
  WITH CHECK (tenant_id = casemind_current_tenant_id());

DROP POLICY IF EXISTS calendar_events_tenant_isolation ON calendar_events;
CREATE POLICY calendar_events_tenant_isolation ON calendar_events
  USING (tenant_id = casemind_current_tenant_id())
  WITH CHECK (tenant_id = casemind_current_tenant_id());

DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;
CREATE POLICY notifications_tenant_isolation ON notifications
  USING (tenant_id = casemind_current_tenant_id())
  WITH CHECK (tenant_id = casemind_current_tenant_id());

DROP POLICY IF EXISTS ai_interaction_placeholders_tenant_isolation ON ai_interaction_placeholders;
CREATE POLICY ai_interaction_placeholders_tenant_isolation ON ai_interaction_placeholders
  USING (tenant_id = casemind_current_tenant_id())
  WITH CHECK (tenant_id = casemind_current_tenant_id());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'casemind_app'
  ) THEN
    CREATE ROLE casemind_app LOGIN PASSWORD 'casemind_app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO casemind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants TO casemind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO casemind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_log_entries TO casemind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_events TO casemind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO casemind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_interaction_placeholders TO casemind_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO casemind_app;