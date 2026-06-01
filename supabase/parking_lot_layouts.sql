create table if not exists parking_lot_layouts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null unique references locations(id) on delete cascade,
  layout jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_parking_lot_layouts_updated_at
before update on parking_lot_layouts
for each row execute function set_updated_at();

alter table parking_lot_layouts enable row level security;

drop policy if exists parking_lot_layouts_read_public on parking_lot_layouts;
create policy parking_lot_layouts_read_public on parking_lot_layouts
  for select
  to anon, authenticated
  using (exists (
    select 1
    from locations
    where locations.id = parking_lot_layouts.location_id
      and locations.is_active = true
  ));
