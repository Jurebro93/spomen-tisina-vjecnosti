CREATE OR REPLACE FUNCTION public.admin_delete_memorial(_memorial_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Zabranjeno'; END IF;
  UPDATE public.invoices SET memorial_id = NULL WHERE memorial_id = _memorial_id;
  UPDATE public.legal_cases SET memorial_id = NULL WHERE memorial_id = _memorial_id;
  UPDATE public.memorial_orders SET memorial_id = NULL WHERE memorial_id = _memorial_id;
  UPDATE public.billing_details SET memorial_id = NULL WHERE memorial_id = _memorial_id;
  UPDATE public.famous_portrait_photos SET memorial_id = NULL WHERE memorial_id = _memorial_id;
  DELETE FROM public.memorials WHERE id = _memorial_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_obituary(_obituary_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Zabranjeno'; END IF;
  FOR m IN SELECT id FROM public.memorials WHERE deceased_id = _obituary_id LOOP
    PERFORM public.admin_delete_memorial(m);
  END LOOP;
  DELETE FROM public.obituaries WHERE id = _obituary_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_delete_memorial(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_obituary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_memorial(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_obituary(uuid) TO authenticated;