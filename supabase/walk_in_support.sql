alter table reservations
add column if not exists source text not null default 'reservation';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_source_check'
  ) then
    alter table reservations
    add constraint reservations_source_check
    check (source in ('reservation', 'walk_in'));
  end if;
end $$;

update reservations
set source = 'reservation'
where source is distinct from 'walk_in'
  and source is distinct from 'reservation';
