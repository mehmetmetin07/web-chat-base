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
-- 2.1 SERVER BANS
-- =====================
CREATE TABLE IF NOT EXISTS public.server_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

ALTER TABLE public.server_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Server admins can view bans" ON public.server_bans;
CREATE POLICY "Server admins can view bans"
  ON public.server_bans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Server admins can ban" ON public.server_bans;
CREATE POLICY "Server admins can ban"
  ON public.server_bans FOR INSERT TO authenticated 
  WITH CHECK (
    -- Server owner can always ban
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
    -- Or admins with ban permission
    OR server_id IN (
      SELECT sm.server_id FROM public.server_members sm
      WHERE sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
    -- Or via role system
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid() 
        AND smr.server_id = server_bans.server_id
        AND (sr.permissions->>'ADMINISTRATOR' = 'true' OR sr.permissions->>'BAN_MEMBERS' = 'true')
    )
  );

DROP POLICY IF EXISTS "Server admins can unban" ON public.server_bans;
CREATE POLICY "Server admins can unban"
  ON public.server_bans FOR DELETE TO authenticated 
  USING (
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid() 
        AND smr.server_id = server_bans.server_id
        AND (sr.permissions->>'ADMINISTRATOR' = 'true' OR sr.permissions->>'BAN_MEMBERS' = 'true')
    )
  );

-- Trigger to auto-remove member when banned
CREATE OR REPLACE FUNCTION public.handle_ban_remove_member()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.server_members 
  WHERE server_id = NEW.server_id AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ban_remove_member ON public.server_bans;
CREATE TRIGGER on_ban_remove_member
  AFTER INSERT ON public.server_bans
  FOR EACH ROW EXECUTE FUNCTION public.handle_ban_remove_member();

-- Add description to servers for rules
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS description TEXT;

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
  ON public.server_members FOR INSERT TO authenticated 
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.server_bans 
      WHERE server_bans.server_id = server_members.server_id 
        AND server_bans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own membership" ON public.server_members;
CREATE POLICY "Users can delete own membership"
  ON public.server_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can kick members" ON public.server_members;
CREATE POLICY "Admins can kick members"
  ON public.server_members FOR DELETE TO authenticated 
  USING (
    -- Server owner can kick anyone
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
    -- Or legacy role check
    OR server_id IN (
      SELECT sm.server_id FROM public.server_members sm
      WHERE sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
    -- Or via new role system
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid() 
        AND smr.server_id = server_members.server_id
        AND (sr.permissions->>'ADMINISTRATOR' = 'true' OR sr.permissions->>'KICK_MEMBERS' = 'true')
    )
  );

DROP POLICY IF EXISTS "Admins can update member roles" ON public.server_members;
CREATE POLICY "Admins can update member roles"
  ON public.server_members FOR UPDATE TO authenticated
  USING (
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid() 
        AND smr.server_id = server_members.server_id
        AND (sr.permissions->>'ADMINISTRATOR' = 'true' OR sr.permissions->>'MANAGE_ROLES' = 'true')
    )
  );

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
-- 4. CHANNEL CATEGORIES
-- =====================
CREATE TABLE IF NOT EXISTS public.channel_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT DEFAULT 0,
  is_collapsed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.channel_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.channel_categories;
CREATE POLICY "Anyone can view categories"
  ON public.channel_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Server owners can manage categories" ON public.channel_categories;
DROP POLICY IF EXISTS "Authorized users can manage categories" ON public.channel_categories;

CREATE POLICY "Authorized users can manage categories"
  ON public.channel_categories FOR ALL TO authenticated
  USING (
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid() 
        AND smr.server_id = channel_categories.server_id
        AND (sr.permissions->>'ADMINISTRATOR' = 'true' OR sr.permissions->>'MANAGE_CHANNELS' = 'true')
    )
  );

CREATE INDEX IF NOT EXISTS idx_channel_categories_server ON public.channel_categories(server_id);

-- =====================
-- 5. GROUPS (CHANNELS) TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.channel_categories(id) ON DELETE SET NULL,
  position INT DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Ensure columns exist (migration support)
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.channel_categories(id) ON DELETE SET NULL;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;
CREATE POLICY "Anyone can view groups"
  ON public.groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Authorized users can update groups" ON public.groups;
CREATE POLICY "Authorized users can update groups"
  ON public.groups FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.servers WHERE id = groups.server_id AND owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid() 
        AND smr.server_id = groups.server_id
        AND (sr.permissions->>'ADMINISTRATOR' = 'true' OR sr.permissions->>'MANAGE_CHANNELS' = 'true')
    )
  );

DROP POLICY IF EXISTS "Authorized users can delete groups" ON public.groups;
CREATE POLICY "Authorized users can delete groups"
  ON public.groups FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.servers WHERE id = groups.server_id AND owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid() 
        AND smr.server_id = groups.server_id
        AND (sr.permissions->>'ADMINISTRATOR' = 'true' OR sr.permissions->>'MANAGE_CHANNELS' = 'true')
    )
  );

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

-- Rename FK for sender_id to be explicit for PostgREST embedding
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_sender_id_fkey') THEN
    ALTER TABLE public.messages RENAME CONSTRAINT messages_sender_id_fkey TO messages_sender_fk;
  END IF;
END $$;

-- Update messages type check to allow files
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check 
  CHECK (type IN ('text', 'image', 'file', 'video'));

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

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);


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

-- =====================
-- 7. SERVER SETTINGS (Auto-Moderation)
-- =====================
CREATE TABLE IF NOT EXISTS public.server_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID UNIQUE REFERENCES public.servers(id) ON DELETE CASCADE,
  banned_words TEXT[] DEFAULT '{}',
  allowed_file_types TEXT[] DEFAULT ARRAY['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt'],
  spam_threshold INT DEFAULT 5,
  spam_window_seconds INT DEFAULT 10,
  spam_action TEXT DEFAULT 'warn' CHECK (spam_action IN ('warn', 'mute', 'kick', 'ban')),
  link_filter BOOLEAN DEFAULT false,
  invite_filter BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.server_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Server members can view settings" ON public.server_settings;
CREATE POLICY "Server members can view settings"
  ON public.server_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Server owners can update settings" ON public.server_settings;
CREATE POLICY "Server owners can update settings"
  ON public.server_settings FOR UPDATE TO authenticated
  USING (
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Server owners can insert settings" ON public.server_settings;
CREATE POLICY "Server owners can insert settings"
  ON public.server_settings FOR INSERT TO authenticated
  WITH CHECK (
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
  );

-- Trigger to create default settings when server is created
CREATE OR REPLACE FUNCTION public.handle_new_server_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.server_settings (server_id)
  VALUES (NEW.id)
  ON CONFLICT (server_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_server_created_settings ON public.servers;
CREATE TRIGGER on_server_created_settings
  AFTER INSERT ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_server_settings();

-- Sync existing servers
INSERT INTO public.server_settings (server_id)
SELECT id FROM public.servers
ON CONFLICT (server_id) DO NOTHING;

-- =====================
-- 8. CHANNEL PERMISSIONS (Role-Based)
-- =====================
-- Drop old table if exists (migration)
DROP TABLE IF EXISTS public.channel_permissions;

CREATE TABLE public.channel_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.server_roles(id) ON DELETE CASCADE,
  -- Basic Permissions
  can_view BOOLEAN DEFAULT true,
  can_send BOOLEAN DEFAULT true,
  can_read_history BOOLEAN DEFAULT true,
  -- Content Permissions
  can_attach BOOLEAN DEFAULT true,
  can_embed_links BOOLEAN DEFAULT true,
  can_add_reactions BOOLEAN DEFAULT true,
  can_use_external_emojis BOOLEAN DEFAULT true,
  -- Interaction Permissions
  can_mention BOOLEAN DEFAULT true,
  can_mention_everyone BOOLEAN DEFAULT false,
  can_create_invite BOOLEAN DEFAULT true,
  -- Moderation Permissions
  can_manage BOOLEAN DEFAULT false,
  can_delete_messages BOOLEAN DEFAULT false,
  can_pin_messages BOOLEAN DEFAULT false,
  -- Rate Limiting
  slowmode_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, role_id)
);

ALTER TABLE public.channel_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view channel permissions" ON public.channel_permissions;
CREATE POLICY "Anyone can view channel permissions"
  ON public.channel_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Server owners can manage permissions" ON public.channel_permissions;
CREATE POLICY "Server owners can manage permissions"
  ON public.channel_permissions FOR ALL TO authenticated
  USING (
    channel_id IN (
      SELECT g.id FROM public.groups g
      JOIN public.servers s ON s.id = g.server_id
      WHERE s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid()
        AND sr.server_id = (SELECT server_id FROM public.groups WHERE id = channel_permissions.channel_id)
        AND sr.permissions->>'ADMINISTRATOR' = 'true'
    )
  );

CREATE INDEX IF NOT EXISTS idx_channel_permissions_channel ON public.channel_permissions(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_permissions_role ON public.channel_permissions(role_id);


-- =====================
-- 9. STORAGE POLICIES
-- =====================
-- Ensure storage schema exists (it usually does by default in Supabase)
-- We cannot create buckets via SQL in standard Supabase easily without extensions, 
-- but we can set policies. Assuming 'chat-files' bucket exists.

DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'chat-files'
);

DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;
CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'chat-files'
);

-- Server Icons bucket policies
DROP POLICY IF EXISTS "Authenticated users can upload server icons" ON storage.objects;
CREATE POLICY "Authenticated users can upload server icons"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'server-icons'
);

DROP POLICY IF EXISTS "Anyone can view server icons" ON storage.objects;
CREATE POLICY "Anyone can view server icons"
ON storage.objects FOR SELECT USING (
  bucket_id = 'server-icons'
);

DROP POLICY IF EXISTS "Server owners can update icons" ON storage.objects;
CREATE POLICY "Server owners can update icons"
ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'server-icons'
);

-- Avatars bucket policies
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'avatars'
);

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT USING (
  bucket_id = 'avatars'
);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'avatars'
);

-- =====================
-- 10. ADVANCED ROLE SYSTEM
-- =====================

-- 10.1 SERVER ROLES
CREATE TABLE IF NOT EXISTS public.server_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#99aab5', -- default grey
  position INT DEFAULT 0,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, name)
);

ALTER TABLE public.server_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view server roles" ON public.server_roles;
CREATE POLICY "Anyone can view server roles"
  ON public.server_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Server owners can manage roles" ON public.server_roles;
DROP POLICY IF EXISTS "Authorized users can manage roles" ON public.server_roles;

CREATE POLICY "Authorized users can manage roles"
  ON public.server_roles FOR ALL TO authenticated
  USING (
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
  );

-- 10.2 SERVER MEMBER ROLES (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.server_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.server_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

ALTER TABLE public.server_member_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view member roles" ON public.server_member_roles;
CREATE POLICY "Anyone can view member roles"
  ON public.server_member_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Server owners can manage member roles" ON public.server_member_roles;
DROP POLICY IF EXISTS "Authorized users can manage member roles" ON public.server_member_roles;

CREATE POLICY "Authorized users can manage member roles"
  ON public.server_member_roles FOR ALL TO authenticated
  USING (
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
  );

-- Indexes for Role System
CREATE INDEX IF NOT EXISTS idx_server_roles_server_id ON public.server_roles(server_id);
CREATE INDEX IF NOT EXISTS idx_server_member_roles_server_id ON public.server_member_roles(server_id);
CREATE INDEX IF NOT EXISTS idx_server_member_roles_user_id ON public.server_member_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_server_member_roles_role_id ON public.server_member_roles(role_id);

-- Trigger to create default roles when a server is created
CREATE OR REPLACE FUNCTION public.handle_new_server_roles()
RETURNS TRIGGER AS $$
DECLARE
  owner_role_id UUID;
  admin_role_id UUID;
  member_role_id UUID;
BEGIN
  -- Create Owner Role (highest pos)
  INSERT INTO public.server_roles (server_id, name, color, position, permissions)
  VALUES (NEW.id, 'Owner', '#e74c3c', 100, '{"ADMINISTRATOR": true}')
  RETURNING id INTO owner_role_id;

  -- Create Member Role (lowest pos)
  INSERT INTO public.server_roles (server_id, name, color, position, permissions)
  VALUES (NEW.id, 'Member', '#99aab5', 0, '{"SEND_MESSAGES": true}')
  RETURNING id INTO member_role_id;

  -- Assign Owner Role to the creator
  INSERT INTO public.server_member_roles (server_id, user_id, role_id)
  VALUES (NEW.id, NEW.owner_id, owner_role_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_server_created_roles ON public.servers;
CREATE TRIGGER on_server_created_roles
  AFTER INSERT ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_server_roles();

-- =====================
-- 11. MODERATION SYSTEM
-- =====================

-- Moderation action logs
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  moderator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('kick', 'ban', 'unban', 'mute', 'unmute', 'warn', 'timeout')),
  reason TEXT,
  duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Server members can view moderation logs" ON public.moderation_logs;
CREATE POLICY "Server members can view moderation logs"
  ON public.moderation_logs FOR SELECT TO authenticated
  USING (
    server_id IN (SELECT server_id FROM public.server_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can create moderation logs" ON public.moderation_logs;
CREATE POLICY "Admins can create moderation logs"
  ON public.moderation_logs FOR INSERT TO authenticated
  WITH CHECK (
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid() 
        AND smr.server_id = moderation_logs.server_id
        AND (sr.permissions->>'ADMINISTRATOR' = 'true' 
             OR sr.permissions->>'KICK_MEMBERS' = 'true'
             OR sr.permissions->>'BAN_MEMBERS' = 'true'
             OR sr.permissions->>'MODERATE_MEMBERS' = 'true')
    )
  );

-- Server mutes (temporary silencing)
CREATE TABLE IF NOT EXISTS public.server_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  muted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

ALTER TABLE public.server_mutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view mutes" ON public.server_mutes;
CREATE POLICY "Anyone can view mutes"
  ON public.server_mutes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can mute members" ON public.server_mutes;
CREATE POLICY "Admins can mute members"
  ON public.server_mutes FOR INSERT TO authenticated
  WITH CHECK (
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid() 
        AND smr.server_id = server_mutes.server_id
        AND (sr.permissions->>'ADMINISTRATOR' = 'true' OR sr.permissions->>'MODERATE_MEMBERS' = 'true')
    )
  );

DROP POLICY IF EXISTS "Admins can unmute members" ON public.server_mutes;
CREATE POLICY "Admins can unmute members"
  ON public.server_mutes FOR DELETE TO authenticated
  USING (
    server_id IN (SELECT id FROM public.servers WHERE owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.server_member_roles smr
      JOIN public.server_roles sr ON sr.id = smr.role_id
      WHERE smr.user_id = auth.uid() 
        AND smr.server_id = server_mutes.server_id
        AND (sr.permissions->>'ADMINISTRATOR' = 'true' OR sr.permissions->>'MODERATE_MEMBERS' = 'true')
    )
  );

-- Function to check if user is muted
CREATE OR REPLACE FUNCTION public.is_user_muted(p_server_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.server_mutes
    WHERE server_id = p_server_id 
      AND user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for moderation tables
CREATE INDEX IF NOT EXISTS idx_moderation_logs_server ON public.moderation_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_target ON public.moderation_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_server_mutes_server ON public.server_mutes(server_id);
CREATE INDEX IF NOT EXISTS idx_server_mutes_user ON public.server_mutes(user_id);

-- =====================
-- 12. REALTIME CONFIGURATION
-- =====================
-- Enable Realtime for tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_member_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;

