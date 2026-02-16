
-- Add soft delete column
ALTER TABLE public.entretiens ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Update SELECT policy to hide deleted items for non-admins
DROP POLICY "Authenticated can view entretiens" ON public.entretiens;
CREATE POLICY "Authenticated can view entretiens"
ON public.entretiens FOR SELECT TO authenticated
USING (deleted_at IS NULL OR has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update (for restore)
DROP POLICY "Authors can update entretiens" ON public.entretiens;
CREATE POLICY "Authors or admins can update entretiens"
ON public.entretiens FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
