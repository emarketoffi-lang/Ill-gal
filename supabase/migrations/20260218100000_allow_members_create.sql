-- Allow assistants (membres) to create operations, QGs, and entretiens
-- Update operations policy
DROP POLICY IF EXISTS "Users create own operations" ON public.operations;

CREATE POLICY "Users create own operations" ON public.operations 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Update entretiens policy
DROP POLICY IF EXISTS "Responsables can create entretiens" ON public.entretiens;

CREATE POLICY "Members can create entretiens" ON public.entretiens 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Update QG policy based on the reunion pattern
DROP POLICY IF EXISTS "Responsables can create reunions" ON public.reunions;

CREATE POLICY "Members can create reunions" ON public.reunions 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);
