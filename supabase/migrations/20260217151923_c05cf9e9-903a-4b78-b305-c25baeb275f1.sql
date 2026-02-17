
CREATE TABLE public.qg (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Gang',
  status TEXT NOT NULL DEFAULT 'Actif',
  responsible_name TEXT NOT NULL,
  pos_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  pos_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.qg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view qg" ON public.qg FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert qg" ON public.qg FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can update qg" ON public.qg FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin can delete qg" ON public.qg FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
