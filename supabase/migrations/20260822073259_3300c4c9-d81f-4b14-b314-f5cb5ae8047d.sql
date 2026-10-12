-- ============ ROLES ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  email text,
  avatar_url text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name',
             split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name',''),' ',1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name',
             NULLIF(substring(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name','') from position(' ' in COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name',' ')) + 1),'')),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ MEMORIALS ============
CREATE TABLE IF NOT EXISTS public.memorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deceased_id uuid NOT NULL REFERENCES public.obituaries(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  relationship text,
  quote text,
  life_story text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','unlisted','private')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  allow_tributes boolean NOT NULL DEFAULT true,
  allow_candles boolean NOT NULL DEFAULT true,
  allow_media_download boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz,
  CONSTRAINT memorials_deceased_id_unique UNIQUE (deceased_id)
);
GRANT SELECT ON public.memorials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorials TO authenticated;
GRANT ALL ON public.memorials TO service_role;
ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_memorials_updated_at BEFORE UPDATE ON public.memorials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MANAGERS ============
CREATE TABLE IF NOT EXISTS public.memorial_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','admin','editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (memorial_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorial_managers TO authenticated;
GRANT ALL ON public.memorial_managers TO service_role;
ALTER TABLE public.memorial_managers ENABLE ROW LEVEL SECURITY;

-- helper functions
CREATE OR REPLACE FUNCTION public.memorial_role(_memorial_id uuid, _user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.memorial_managers WHERE memorial_id = _memorial_id AND user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_memorial(_memorial_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.memorial_role(_memorial_id, auth.uid()) IN ('owner','admin','editor')
      OR public.has_role(auth.uid(),'admin');
$$;

CREATE OR REPLACE FUNCTION public.can_moderate_memorial(_memorial_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.memorial_role(_memorial_id, auth.uid()) IN ('owner','admin')
      OR public.has_role(auth.uid(),'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_memorial_owner(_memorial_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.memorial_role(_memorial_id, auth.uid()) = 'owner';
$$;

CREATE OR REPLACE FUNCTION public.memorial_is_viewable(_memorial_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memorials m
    WHERE m.id = _memorial_id AND m.status = 'published' AND m.visibility IN ('public','unlisted')
  ) OR public.can_edit_memorial(_memorial_id);
$$;

CREATE OR REPLACE FUNCTION public.memorial_allows(_memorial_id uuid, _what text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memorials m
    WHERE m.id = _memorial_id AND m.status = 'published'
      AND ((_what = 'tributes' AND m.allow_tributes) OR (_what = 'candles' AND m.allow_candles))
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_memorial_slug(_ime text, _prezime text, _rodenja date, _smrti date)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text; final text; counter int := 0;
BEGIN
  base := lower(trim(coalesce(_ime,'') || '-' || coalesce(_prezime,'')));
  base := replace(replace(replace(replace(replace(base,'č','c'),'ć','c'),'ž','z'),'š','s'),'đ','d');
  base := regexp_replace(base, '\s+', '-', 'g');
  base := regexp_replace(base, '[^a-z0-9\-]', '', 'g');
  base := regexp_replace(base, '-+', '-', 'g');
  base := trim(both '-' from base);
  IF base = '' OR base = '-' THEN base := 'memorijal'; END IF;
  final := base;
  IF EXISTS (SELECT 1 FROM public.memorials WHERE slug = final) AND (_rodenja IS NOT NULL OR _smrti IS NOT NULL) THEN
    final := base || '-' || coalesce(extract(year from _rodenja)::text,'') ||
             CASE WHEN _rodenja IS NOT NULL AND _smrti IS NOT NULL THEN '-' ELSE '' END ||
             coalesce(extract(year from _smrti)::text,'');
  END IF;
  WHILE EXISTS (SELECT 1 FROM public.memorials WHERE slug = final) LOOP
    counter := counter + 1;
    final := base || '-' || counter::text;
  END LOOP;
  RETURN final;
END; $$;

-- memorials policies
CREATE POLICY "Public can read published public memorials" ON public.memorials
  FOR SELECT USING (status = 'published' AND visibility IN ('public','unlisted'));
CREATE POLICY "Managers can read their memorials" ON public.memorials
  FOR SELECT TO authenticated USING (public.can_edit_memorial(id));
CREATE POLICY "Authenticated can create memorial as owner" ON public.memorials
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Managers can update memorial" ON public.memorials
  FOR UPDATE TO authenticated USING (public.can_edit_memorial(id)) WITH CHECK (public.can_edit_memorial(id));
CREATE POLICY "Owner can delete memorial" ON public.memorials
  FOR DELETE TO authenticated USING (public.is_memorial_owner(id) OR public.has_role(auth.uid(),'admin'));

-- managers policies
CREATE POLICY "Managers can read managers" ON public.memorial_managers
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.can_edit_memorial(memorial_id));
CREATE POLICY "Owner bootstrap or moderators add managers" ON public.memorial_managers
  FOR INSERT TO authenticated WITH CHECK (
    (role = 'owner' AND user_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.owner_id = auth.uid())
      AND NOT EXISTS (SELECT 1 FROM public.memorial_managers mm WHERE mm.memorial_id = memorial_id))
    OR (role IN ('admin','editor') AND public.can_moderate_memorial(memorial_id))
  );
CREATE POLICY "Moderators can update non-owner managers" ON public.memorial_managers
  FOR UPDATE TO authenticated USING (public.can_moderate_memorial(memorial_id) AND role <> 'owner')
  WITH CHECK (public.can_moderate_memorial(memorial_id) AND role <> 'owner');
CREATE POLICY "Owner can remove managers" ON public.memorial_managers
  FOR DELETE TO authenticated USING (
    (public.is_memorial_owner(memorial_id) AND role <> 'owner') OR public.has_role(auth.uid(),'admin')
  );

-- ============ MEDIA ============
CREATE TABLE IF NOT EXISTS public.memorial_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'image' CHECK (type IN ('image','video')),
  storage_path text,
  external_url text,
  title text,
  description text,
  media_date date,
  sort_order integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.memorial_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorial_media TO authenticated;
GRANT ALL ON public.memorial_media TO service_role;
ALTER TABLE public.memorial_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read media of viewable memorials" ON public.memorial_media
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.status='published' AND m.visibility IN ('public','unlisted')));
CREATE POLICY "Managers can read media" ON public.memorial_media
  FOR SELECT TO authenticated USING (public.can_edit_memorial(memorial_id));
CREATE POLICY "Managers can insert media" ON public.memorial_media
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_memorial(memorial_id));
CREATE POLICY "Managers can update media" ON public.memorial_media
  FOR UPDATE TO authenticated USING (public.can_edit_memorial(memorial_id)) WITH CHECK (public.can_edit_memorial(memorial_id));
CREATE POLICY "Managers can delete media" ON public.memorial_media
  FOR DELETE TO authenticated USING (public.can_edit_memorial(memorial_id));

-- ============ LIFE EVENTS ============
CREATE TABLE IF NOT EXISTS public.memorial_life_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  event_date date,
  event_year integer,
  title text NOT NULL,
  description text,
  media_id uuid REFERENCES public.memorial_media(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.memorial_life_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorial_life_events TO authenticated;
GRANT ALL ON public.memorial_life_events TO service_role;
ALTER TABLE public.memorial_life_events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_memorial_life_events_updated_at BEFORE UPDATE ON public.memorial_life_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Public can read events of viewable memorials" ON public.memorial_life_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.status='published' AND m.visibility IN ('public','unlisted')));
CREATE POLICY "Managers can read events" ON public.memorial_life_events
  FOR SELECT TO authenticated USING (public.can_edit_memorial(memorial_id));
CREATE POLICY "Managers can insert events" ON public.memorial_life_events
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_memorial(memorial_id));
CREATE POLICY "Managers can update events" ON public.memorial_life_events
  FOR UPDATE TO authenticated USING (public.can_edit_memorial(memorial_id)) WITH CHECK (public.can_edit_memorial(memorial_id));
CREATE POLICY "Managers can delete events" ON public.memorial_life_events
  FOR DELETE TO authenticated USING (public.can_edit_memorial(memorial_id));

-- ============ TRIBUTES ============
CREATE TABLE IF NOT EXISTS public.memorial_tributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_email text NOT NULL,
  relationship text,
  title text,
  message text NOT NULL,
  photo_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid
);
GRANT SELECT (id, memorial_id, author_name, relationship, title, message, photo_path, status, created_at, approved_at) ON public.memorial_tributes TO anon, authenticated;
GRANT INSERT ON public.memorial_tributes TO anon, authenticated;
GRANT UPDATE, DELETE ON public.memorial_tributes TO authenticated;
GRANT ALL ON public.memorial_tributes TO service_role;
ALTER TABLE public.memorial_tributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read approved tributes" ON public.memorial_tributes
  FOR SELECT USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.status='published' AND m.visibility IN ('public','unlisted')));
CREATE POLICY "Moderators can read all tributes" ON public.memorial_tributes
  FOR SELECT TO authenticated USING (public.can_edit_memorial(memorial_id));
CREATE POLICY "Anyone can submit pending tribute" ON public.memorial_tributes
  FOR INSERT WITH CHECK (status = 'pending' AND consent = true AND approved_at IS NULL AND approved_by IS NULL AND public.memorial_allows(memorial_id,'tributes'));
CREATE POLICY "Moderators can update tributes" ON public.memorial_tributes
  FOR UPDATE TO authenticated USING (public.can_moderate_memorial(memorial_id)) WITH CHECK (public.can_moderate_memorial(memorial_id));
CREATE POLICY "Moderators can delete tributes" ON public.memorial_tributes
  FOR DELETE TO authenticated USING (public.can_moderate_memorial(memorial_id));

-- ============ CANDLES ============
CREATE TABLE IF NOT EXISTS public.memorial_candles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  visitor_name text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid
);
GRANT SELECT ON public.memorial_candles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorial_candles TO authenticated;
GRANT INSERT ON public.memorial_candles TO anon;
GRANT ALL ON public.memorial_candles TO service_role;
ALTER TABLE public.memorial_candles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read approved candles" ON public.memorial_candles
  FOR SELECT USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.status='published' AND m.visibility IN ('public','unlisted')));
CREATE POLICY "Moderators can read all candles" ON public.memorial_candles
  FOR SELECT TO authenticated USING (public.can_edit_memorial(memorial_id));
CREATE POLICY "Anyone can light pending candle" ON public.memorial_candles
  FOR INSERT WITH CHECK (status = 'pending' AND approved_at IS NULL AND approved_by IS NULL AND public.memorial_allows(memorial_id,'candles'));
CREATE POLICY "Moderators can update candles" ON public.memorial_candles
  FOR UPDATE TO authenticated USING (public.can_moderate_memorial(memorial_id)) WITH CHECK (public.can_moderate_memorial(memorial_id));
CREATE POLICY "Moderators can delete candles" ON public.memorial_candles
  FOR DELETE TO authenticated USING (public.can_moderate_memorial(memorial_id));

-- ============ ACCESS REQUESTS ============
CREATE TABLE IF NOT EXISTS public.memorial_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.memorial_access_requests TO authenticated;
GRANT ALL ON public.memorial_access_requests TO service_role;
ALTER TABLE public.memorial_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requester or moderators can read requests" ON public.memorial_access_requests
  FOR SELECT TO authenticated USING (requester_user_id = auth.uid() OR public.can_moderate_memorial(memorial_id));
CREATE POLICY "Users can create own request" ON public.memorial_access_requests
  FOR INSERT TO authenticated WITH CHECK (requester_user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Moderators can resolve requests" ON public.memorial_access_requests
  FOR UPDATE TO authenticated USING (public.can_moderate_memorial(memorial_id)) WITH CHECK (public.can_moderate_memorial(memorial_id));

-- ============ INVITES ============
CREATE TABLE IF NOT EXISTS public.memorial_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin','editor')),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT ON public.memorial_invites TO authenticated;
GRANT ALL ON public.memorial_invites TO service_role;
ALTER TABLE public.memorial_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moderators can read invites" ON public.memorial_invites
  FOR SELECT TO authenticated USING (public.can_moderate_memorial(memorial_id));

-- ============ CONTENT REPORTS ============
CREATE TABLE IF NOT EXISTS public.memorial_content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  reason text NOT NULL,
  description text,
  reporter_user_id uuid,
  reporter_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
GRANT INSERT ON public.memorial_content_reports TO anon, authenticated;
GRANT SELECT, UPDATE ON public.memorial_content_reports TO authenticated;
GRANT ALL ON public.memorial_content_reports TO service_role;
ALTER TABLE public.memorial_content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can report content" ON public.memorial_content_reports
  FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "Moderators and admins can read reports" ON public.memorial_content_reports
  FOR SELECT TO authenticated USING (public.can_moderate_memorial(memorial_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Moderators and admins can resolve reports" ON public.memorial_content_reports
  FOR UPDATE TO authenticated USING (public.can_moderate_memorial(memorial_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.can_moderate_memorial(memorial_id) OR public.has_role(auth.uid(),'admin'));

-- ============ AUDIT LOG ============
CREATE TABLE IF NOT EXISTS public.memorial_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.memorial_audit_log TO authenticated;
GRANT ALL ON public.memorial_audit_log TO service_role;
ALTER TABLE public.memorial_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers can read audit log" ON public.memorial_audit_log
  FOR SELECT TO authenticated USING (public.can_edit_memorial(memorial_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Managers can write audit log" ON public.memorial_audit_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_edit_memorial(memorial_id));

CREATE INDEX IF NOT EXISTS idx_memorials_status_visibility ON public.memorials(status, visibility);
CREATE INDEX IF NOT EXISTS idx_memorial_media_memorial ON public.memorial_media(memorial_id);
CREATE INDEX IF NOT EXISTS idx_memorial_tributes_memorial_status ON public.memorial_tributes(memorial_id, status);
CREATE INDEX IF NOT EXISTS idx_memorial_candles_memorial_status ON public.memorial_candles(memorial_id, status);
CREATE INDEX IF NOT EXISTS idx_memorial_managers_user ON public.memorial_managers(user_id);