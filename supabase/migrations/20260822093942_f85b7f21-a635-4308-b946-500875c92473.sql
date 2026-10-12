-- 1) Owner can always read own memorials (needed for INSERT ... RETURNING)
CREATE POLICY "Owner can read own memorials"
ON public.memorials
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- 2) can_edit_memorial must recognise the owner directly
CREATE OR REPLACE FUNCTION public.can_edit_memorial(_memorial_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = _memorial_id AND m.owner_id = auth.uid()
    )
    OR public.memorial_role(_memorial_id, auth.uid()) IN ('owner','admin','editor')
    OR public.has_role(auth.uid(),'admin');
$function$;

-- 3) Fix broken owner bootstrap policy on memorial_managers
DROP POLICY IF EXISTS "Owner bootstrap or moderators add managers" ON public.memorial_managers;

CREATE POLICY "Owner bootstrap or moderators add managers"
ON public.memorial_managers
FOR INSERT
TO authenticated
WITH CHECK (
  (
    role = 'owner'
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.memorials m
      WHERE m.id = memorial_managers.memorial_id AND m.owner_id = auth.uid()
    )
  )
  OR (
    role IN ('admin','editor') AND public.can_moderate_memorial(memorial_id)
  )
);