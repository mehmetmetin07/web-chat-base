-- =====================
-- SERVERS (Workspaces)
-- =====================
CREATE TABLE IF NOT EXISTS public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.server_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

-- Add server_id to groups (channels)
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_servers_invite_code ON public.servers(invite_code);
CREATE INDEX IF NOT EXISTS idx_servers_owner_id ON public.servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON public.server_members(user_id);
CREATE INDEX IF NOT EXISTS idx_server_members_server_id ON public.server_members(server_id);
CREATE INDEX IF NOT EXISTS idx_groups_server_id ON public.groups(server_id);

-- =====================
-- TRIGGERS
-- =====================

-- Auto-add owner as member when server is created
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

-- Create default #general channel when server is created
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
-- RLS POLICIES
-- =====================
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Server members can view servers" ON public.servers;
DROP POLICY IF EXISTS "Users can create servers" ON public.servers;
DROP POLICY IF EXISTS "Owners can update servers" ON public.servers;
DROP POLICY IF EXISTS "View server members" ON public.server_members;
DROP POLICY IF EXISTS "Users can join servers" ON public.server_members;
DROP POLICY IF EXISTS "Users can leave servers" ON public.server_members;

-- Servers: Anyone authenticated can view (for invite lookup)
CREATE POLICY "Authenticated users can view servers"
  ON public.servers FOR SELECT
  TO authenticated
  USING (true);

-- Servers: Authenticated users can create
CREATE POLICY "Users can create servers"
  ON public.servers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Servers: Owners can update
CREATE POLICY "Owners can update servers"
  ON public.servers FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Server Members: Anyone can view (no recursion)
CREATE POLICY "Anyone can view server members"
  ON public.server_members FOR SELECT
  TO authenticated
  USING (true);

-- Server Members: Can insert own membership
CREATE POLICY "Users can insert own membership"
  ON public.server_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Server Members: Can delete own membership
CREATE POLICY "Users can delete own membership"
  ON public.server_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Sync existing server owners to members
INSERT INTO public.server_members (server_id, user_id, role)
SELECT id, owner_id, 'owner' FROM public.servers
ON CONFLICT (server_id, user_id) DO NOTHING;

