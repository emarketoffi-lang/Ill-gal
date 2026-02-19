-- Allow all authenticated users to read user_roles so the hierarchy displays correctly for everyone
-- Previously only admins could see all roles, causing non-admin users to see everyone as "Assistant"

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "All authenticated users can view roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);
