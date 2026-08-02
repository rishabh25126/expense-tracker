-- Multi-user auth + group schema — run in Supabase SQL editor
-- WARNING: drops existing application tables and all data

DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS app_logs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  join_code text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  prev_period_start date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE group_members (
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  app_notifications_enabled boolean NOT NULL DEFAULT true,
  push_notifications_enabled boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount numeric NOT NULL,
  category text NOT NULL,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('expense_created')),
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  endpoint text NOT NULL,
  subscription jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE TABLE app_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX expenses_group_id_idx ON expenses(group_id);
CREATE INDEX expenses_created_by_idx ON expenses(created_by);
CREATE INDEX categories_group_id_idx ON categories(group_id);
CREATE INDEX group_members_user_id_idx ON group_members(user_id);
CREATE INDEX notifications_recipient_unread_idx ON notifications(recipient_id, read_at, created_at DESC);
CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles own read" ON profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "profiles own update" ON profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "members see own membership" ON group_members
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "members see joined groups" ON groups
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id AND gm.user_id = (select auth.uid())
  ));

CREATE POLICY "members see group expenses" ON expenses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = expenses.group_id AND gm.user_id = (select auth.uid())
  ));

CREATE POLICY "members see group categories" ON categories
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = categories.group_id AND gm.user_id = (select auth.uid())
  ));

CREATE POLICY "users see own notifications" ON notifications
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = recipient_id);

CREATE POLICY "users update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = recipient_id)
  WITH CHECK ((select auth.uid()) = recipient_id);

CREATE POLICY "users manage own push subscriptions" ON push_subscriptions
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
