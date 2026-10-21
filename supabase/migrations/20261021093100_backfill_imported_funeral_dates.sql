-- One-off: correct the funeral dates already imported wrong (see the previous
-- migration). The old values are kept in a backup table so this can be undone.
create table if not exists public.obituaries_datum_ukopa_backup_20261021 as
  select id, datum_ukopa from public.obituaries
  where datum_ukopa::date < coalesce(datum_smrti, created_at::date) - 30;

alter table public.obituaries_datum_ukopa_backup_20261021 enable row level security;

-- Touching datum_ukopa fires fix_obituary_funeral_date, which does the correction.
update public.obituaries o
set datum_ukopa = o.datum_ukopa
from public.obituaries_datum_ukopa_backup_20261021 b
where b.id = o.id;
