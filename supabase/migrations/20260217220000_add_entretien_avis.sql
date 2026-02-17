CREATE TABLE IF NOT EXISTS public.entretien_avis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entretien_id UUID NOT NULL REFERENCES public.entretiens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entretien_avis ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'entretien_avis' AND policyname = 'Authenticated can view entretien avis'
  ) THEN
    CREATE POLICY "Authenticated can view entretien avis"
      ON public.entretien_avis FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'entretien_avis' AND policyname = 'Authenticated can insert own entretien avis'
  ) THEN
    CREATE POLICY "Authenticated can insert own entretien avis"
      ON public.entretien_avis FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;