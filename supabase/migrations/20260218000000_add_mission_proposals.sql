CREATE TABLE IF NOT EXISTS public.mission_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mission_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view mission proposals" ON public.mission_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own proposals" ON public.mission_proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own proposals" ON public.mission_proposals FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own proposals" ON public.mission_proposals FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete proposals" ON public.mission_proposals FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
