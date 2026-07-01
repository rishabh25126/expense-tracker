-- Phase 8 Schema — run in Supabase SQL editor
-- WARNING: drops existing tables and all data

DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- Groups (trackers)
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  prev_period_start date,
  created_at timestamptz DEFAULT now()
);

-- Expenses scoped to group
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  category text NOT NULL,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Custom categories scoped to group
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL
);

-- No RLS needed — server uses service role key
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Push subscriptions (one row per device/browser install per tracker)
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  endpoint text NOT NULL,
  subscription jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX push_subscriptions_group_id_idx ON push_subscriptions(group_id);
CREATE INDEX push_subscriptions_device_id_idx ON push_subscriptions(device_id);
CREATE UNIQUE INDEX push_subscriptions_group_device_uidx ON push_subscriptions(group_id, device_id);

ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;

-- Application Logs (Phase 20)
DROP TABLE IF EXISTS app_logs CASCADE;

CREATE TABLE app_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;
