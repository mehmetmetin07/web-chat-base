ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

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

CREATE POLICY "View group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Group admins can manage members"
  ON public.group_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "View messages in joined groups"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid()
    )
    OR sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR group_id IN (SELECT id FROM public.groups)
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);
