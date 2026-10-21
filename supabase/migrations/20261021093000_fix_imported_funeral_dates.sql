-- The daily WordPress import sometimes stores a decades-old date (usually the birth
-- date) as datum_ukopa, so the obituary says "Sprovod 7. rujna 1941." and drops to
-- the bottom of lists ordered by funeral date. The real funeral date is almost always
-- in the obituary text ("21. listopada 2026.", "21.X.2026.", "21.10.2026."), so a
-- funeral date more than 30 days before the death (or the import) is replaced with
-- the date read from the text, or left empty when the text has none.

create or replace function public.obituary_funeral_date_from_text(txt text, ref date, death date)
returns date language plpgsql immutable set search_path = public as $$
declare
  months constant text[] := array['siječnja','veljače','ožujka','travnja','svibnja','lipnja','srpnja','kolovoza','rujna','listopada','studenoga','prosinca'];
  romans constant text[] := array['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  lo date := coalesce(death, ref - 60);
  hi date := ref + 45;
  best date;
  same date;
  d date;
  x text[];
  mon int;
  yr int;
begin
  if txt is null or ref is null then return null; end if;
  -- "21. listopada 2026", "1. listopada"
  for x in select regexp_matches(txt, '(\d{1,2})\.\s*(siječnja|veljače|ožujka|travnja|svibnja|lipnja|srpnja|kolovoza|rujna|listopada|studenoga|studenog|prosinca)(?:\s*(\d{4}))?', 'gi') loop
    mon := array_position(months, case lower(x[2]) when 'studenog' then 'studenoga' else lower(x[2]) end);
    yr := coalesce(x[3]::int, extract(year from ref)::int);
    begin d := make_date(yr, mon, x[1]::int); exception when others then d := null; end;
    if d between lo and hi then
      if death is not null and d = death then same := d;
      elsif best is null or d < best then best := d; end if;
    end if;
  end loop;
  -- "21.X.2026", "20.X."
  for x in select regexp_matches(txt, '(\d{1,2})\.\s*(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)\.(?:\s*(\d{4}))?', 'g') loop
    mon := array_position(romans, x[2]);
    yr := coalesce(x[3]::int, extract(year from ref)::int);
    begin d := make_date(yr, mon, x[1]::int); exception when others then d := null; end;
    if d between lo and hi then
      if death is not null and d = death then same := d;
      elsif best is null or d < best then best := d; end if;
    end if;
  end loop;
  -- "21.10.2026"
  for x in select regexp_matches(txt, '(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})', 'g') loop
    begin d := make_date(x[3]::int, x[2]::int, x[1]::int); exception when others then d := null; end;
    if d between lo and hi then
      if death is not null and d = death then same := d;
      elsif best is null or d < best then best := d; end if;
    end if;
  end loop;
  -- the earliest date after the death; the death day itself only when nothing else fits
  return coalesce(best, same);
end $$;

create or replace function public.fix_obituary_funeral_date()
returns trigger language plpgsql set search_path = public as $$
declare
  ref date := coalesce(new.created_at, now())::date;
  parsed date;
begin
  if new.datum_ukopa is not null and new.datum_ukopa::date < coalesce(new.datum_smrti, ref) - 30 then
    parsed := public.obituary_funeral_date_from_text(new.biografija, ref, new.datum_smrti);
    new.datum_ukopa := case when parsed is null then null else parsed::timestamp at time zone 'UTC' end;
  end if;
  return new;
end $$;

drop trigger if exists fix_obituary_funeral_date on public.obituaries;
create trigger fix_obituary_funeral_date
  before insert or update of datum_ukopa, datum_smrti, biografija on public.obituaries
  for each row execute function public.fix_obituary_funeral_date();
