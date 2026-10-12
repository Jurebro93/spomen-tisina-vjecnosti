-- Create function to count obituaries by city using database aggregation
create or replace function public.obituary_city_counts()
returns table(name text, count bigint)
language sql
stable
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

-- Allow your client to call it (adjust role if you use a service role on server):
grant execute on function public.obituary_city_counts() to anon, authenticated;