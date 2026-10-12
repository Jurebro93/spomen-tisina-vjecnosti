create or replace function public.obituary_city_counts()
returns table(name text, count bigint)
language sql stable set search_path = public
as $$
  select city as name, count(*)::bigint
  from (
    select trim(regexp_replace(mjesto_smrti, '\s+', ' ', 'g')) as city, datum_smrti, created_at
    from public.obituaries
    where nullif(trim(coalesce(mjesto_smrti,'')), '') is not null
  ) t
  group by 1
  having count(*) >= 4
     or bool_or(extract(year from coalesce(datum_smrti, created_at::date)) >= extract(year from now()))
  order by 2 desc, 1;
$$;
grant execute on function public.obituary_city_counts() to anon, authenticated;