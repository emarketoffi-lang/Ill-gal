-- Allow all authenticated users to see all operations (not just their own)
DROP POLICY IF EXISTS "Users see own operations" ON public.operations;

CREATE POLICY "All users can see operations" ON public.operations
  FOR SELECT TO authenticated
  USING (true);
