ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "View messages in joined groups" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- Users policies
CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Groups (channels) policies
CREATE POLICY "Anyone can view groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Group owners can update groups"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);
  
CREATE POLICY "Group owners can delete groups"
  ON public.groups FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Messages policies (server-based)
CREATE POLICY "Server members can view messages"
  ON public.messages FOR SELECT
  TO authenticated
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
  ON public.messages FOR INSERT
  TO authenticated
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
