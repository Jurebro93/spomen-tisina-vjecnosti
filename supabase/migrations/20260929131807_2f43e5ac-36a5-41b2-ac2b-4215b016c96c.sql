create or replace function public.search_memorial_people(_query text, _limit int default 8)
returns table (p_slug text, p_ime text, p_prezime text, p_datum_rodenja date, p_datum_smrti date)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select lower(trim(_query)) as raw,
           translate(lower(trim(_query)), 'ćčžšđ', 'cczsd') as flat,
           regexp_replace(translate(lower(trim(_query)), 'ćčžšđ', 'cczsd'), '\\s+', ' ', 'g') as flat_norm
  )
  select m.slug, o.ime, o.prezime, o.datum_rodenja, o.datum_smrti
  from public.memorials m
  join public.obituaries o on o.id = m.deceased_id
  cross join q
  where m.status = 'published'
    and m.visibility = 'public'
    and public.memorial_is_viewable(m.id)
    and (
      o.ime ilike '%' || q.raw || '%'
      or o.prezime ilike '%' || q.raw || '%'
      or (o.ime || ' ' || o.prezime) ilike '%' || q.raw || '%'
      or (o.prezime || ' ' || o.ime) ilike '%' || q.raw || '%'
      or translate(lower(o.ime), 'ćčžšđ', 'cczsd') ilike '%' || q.flat || '%'
      or translate(lower(o.prezime), 'ćčžšđ', 'cczsd') ilike '%' || q.flat || '%'
      or translate(lower(o.ime || ' ' || o.prezime), 'ćčžšđ', 'cczsd') ilike '%' || q.flat_norm || '%'
      or translate(lower(o.prezime || ' ' || o.ime), 'ćčžšđ', 'cczsd') ilike '%' || q.flat_norm || '%'
    )
  order by o.prezime, o.ime
  limit least(greatest(_limit, 1), 20);
$$;

grant execute on function public.search_memorial_people(text, int) to anon, authenticated;
grant execute on function public.search_memorial_people(text, int) to service_role;