-- ================================================
-- WEB CHAT BASE - COMPLETE DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- ================================================

-- =====================
-- 1. USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add username column if not exists (for existing databases)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Trigger to auto-create user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync existing auth users
INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 2. SERVERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view servers" ON public.servers;
CREATE POLICY "Authenticated users can view servers"
  ON public.servers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create servers" ON public.servers;
CREATE POLICY "Users can create servers"
  ON public.servers FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update servers" ON public.servers;
CREATE POLICY "Owners can update servers"
  ON public.servers FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

-- =====================
-- 3. SERVER MEMBERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.server_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view server members" ON public.server_members;
CREATE POLICY "Anyone can view server members"
  ON public.server_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own membership" ON public.server_members;
CREATE POLICY "Users can insert own membership"
  ON public.server_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own membership" ON public.server_members;
CREATE POLICY "Users can delete own membership"
  ON public.server_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to add owner as member
CREATE OR REPLACE FUNCTION public.handle_new_server()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_server_created ON public.servers;
CREATE TRIGGER on_server_created
  AFTER INSERT ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_server();

-- Sync existing server owners
INSERT INTO public.server_members (server_id, user_id, role)
SELECT id, owner_id, 'owner' FROM public.servers
ON CONFLICT (server_id, user_id) DO NOTHING;

-- =====================
-- 4. GROUPS (CHANNELS) TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;
CREATE POLICY "Anyone can view groups"
  ON public.groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- Trigger to create default channel
CREATE OR REPLACE FUNCTION public.handle_new_server_channel()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.groups (name, server_id, owner_id, description)
  VALUES ('general', NEW.id, NEW.owner_id, 'General discussion');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_server_created_channel ON public.servers;
CREATE TRIGGER on_server_created_channel
  AFTER INSERT ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_server_channel();

-- =====================
-- 5. MESSAGES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View messages in joined groups" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Server members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Server members can send messages" ON public.messages;

CREATE POLICY "Server members can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT g.id FROM public.groups g
      JOIN public.server_members sm ON sm.server_id = g.server_id
      WHERE sm.user_id = auth.uid()
    )
    OR sender_id = auth.uid()
    OR receiver_id = auth.uid()
  );

CREATE POLICY "Server members can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      group_id IS NULL
      OR group_id IN (
        SELECT g.id FROM public.groups g
        JOIN public.server_members sm ON sm.server_id = g.server_id
        WHERE sm.user_id = auth.uid()
      )
    )
  );

-- =====================
-- 6. INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_servers_invite_code ON public.servers(invite_code);
CREATE INDEX IF NOT EXISTS idx_servers_owner_id ON public.servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON public.server_members(user_id);
CREATE INDEX IF NOT EXISTS idx_server_members_server_id ON public.server_members(server_id);
CREATE INDEX IF NOT EXISTS idx_groups_server_id ON public.groups(server_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
