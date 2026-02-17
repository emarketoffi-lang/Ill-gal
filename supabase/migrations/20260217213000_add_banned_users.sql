CREATE TABLE IF NOT EXISTS public.banned_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'banned_users' AND policyname = 'Admins can view banned users'
  ) THEN
    CREATE POLICY "Admins can view banned users"
      ON public.banned_users FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'banned_users' AND policyname = 'Admins can manage bans'
  ) THEN
    CREATE POLICY "Admins can manage bans"
      ON public.banned_users FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'banned_users' AND policyname = 'Users can view own ban state'
  ) THEN
    CREATE POLICY "Users can view own ban state"
      ON public.banned_users FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;