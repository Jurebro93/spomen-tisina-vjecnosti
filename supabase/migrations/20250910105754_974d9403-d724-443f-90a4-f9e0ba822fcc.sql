-- Fix security warning by setting search_path for the obituary_city_counts function
create or replace function public.obituary_city_counts()
returns table(name text, count bigint)
language sql
stable
set search_path = public
as $$
  select city as name, count(*)::bigint
  from (
    select trim(regexp_replace(mjesto_smrti, '\s+', ' ', 'g')) as city
    from public.obituaries
    where coalesce(nullif(mjesto_smrti, ''), null) is not null
  ) t
  group by 1
  order by 2 desc, 1;
$$;