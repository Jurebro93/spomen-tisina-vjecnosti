REVOKE EXECUTE ON FUNCTION public.generate_memorial_slug(text, text, date, date) FROM anon;

DROP POLICY IF EXISTS "Anyone can upload obituary photos" ON storage.objects;
CREATE POLICY "Anyone can upload obituary photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'obituary-photos'
    AND coalesce((storage.foldername(name))[1], '') <> 'memorials'
  );

CREATE POLICY "Managers can upload memorial photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'obituary-photos'
    AND (storage.foldername(name))[1] = 'memorials'
    AND public.can_edit_memorial(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Managers can update memorial photos" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'obituary-photos'
    AND (storage.foldername(name))[1] = 'memorials'
    AND public.can_edit_memorial(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Managers can delete memorial photos" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'obituary-photos'
    AND (storage.foldername(name))[1] = 'memorials'
    AND public.can_edit_memorial(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Visitors can upload tribute photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'obituary-photos'
    AND (storage.foldername(name))[1] = 'memorials'
    AND (storage.foldername(name))[3] = 'tributes'
    AND public.memorial_allows(((storage.foldername(name))[2])::uuid, 'tributes')
  );