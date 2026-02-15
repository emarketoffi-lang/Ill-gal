
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'responsable', 'membre');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'membre',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'membre');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User roles RLS
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 1. Operations (espace personnel responsables)
CREATE TABLE public.operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'en_cours',
  operation_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own operations" ON public.operations FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own operations" ON public.operations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (public.has_role(auth.uid(), 'responsable') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users update own operations" ON public.operations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own operations" ON public.operations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Reunions
CREATE TABLE public.reunions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  reunion_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  participants TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reunions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view reunions" ON public.reunions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Responsables can create reunions" ON public.reunions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (public.has_role(auth.uid(), 'responsable') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Authors can update reunions" ON public.reunions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authors can delete reunions" ON public.reunions FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. Rapports de session
CREATE TABLE public.rapports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rapports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view rapports" ON public.rapports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own rapports" ON public.rapports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rapports" ON public.rapports FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own rapports" ON public.rapports FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. Entretiens & Votes
CREATE TABLE public.entretiens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  candidate_name TEXT NOT NULL,
  group_name TEXT,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.entretiens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view entretiens" ON public.entretiens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Responsables can create entretiens" ON public.entretiens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (public.has_role(auth.uid(), 'responsable') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Authors can update entretiens" ON public.entretiens FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete entretiens" ON public.entretiens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entretien_id UUID REFERENCES public.entretiens(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entretien_id, user_id)
);
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view votes" ON public.votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Responsables can vote" ON public.votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (public.has_role(auth.uid(), 'responsable') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users can update own vote" ON public.votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 5. Registre des échanges
CREATE TABLE public.echanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  donor_name TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.echanges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view echanges" ON public.echanges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create echanges" ON public.echanges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own echanges" ON public.echanges FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own echanges" ON public.echanges FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 6. Discussion interne (realtime)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view messages" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can delete messages" ON public.messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 7. Dissolutions de groupe
CREATE TABLE public.dissolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  dissolution_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dissolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view dissolutions" ON public.dissolutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Responsables can create dissolutions" ON public.dissolutions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (public.has_role(auth.uid(), 'responsable') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Authors can update dissolutions" ON public.dissolutions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete dissolutions" ON public.dissolutions FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users mark own notifications read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON public.operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_rapports_updated_at BEFORE UPDATE ON public.rapports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
