create table if not exists public.user_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  model text not null,
  color text not null,
  plate_number text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plate_number)
);

create unique index if not exists user_vehicles_single_default_idx
  on public.user_vehicles (user_id)
  where is_default = true;

create or replace function public.normalize_user_vehicle_plate()
returns trigger
language plpgsql
as $$
begin
  new.model := trim(new.model);
  new.color := trim(new.color);
  new.plate_number := upper(regexp_replace(trim(new.plate_number), '[^A-Z0-9 -]', '', 'g'));
  return new;
end;
$$;

drop trigger if exists normalize_user_vehicle_plate_before_write on public.user_vehicles;
create trigger normalize_user_vehicle_plate_before_write
before insert or update on public.user_vehicles
for each row execute function public.normalize_user_vehicle_plate();

create or replace function public.clear_other_default_user_vehicles()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.user_vehicles
    set is_default = false
    where user_id = new.user_id
      and id <> new.id
      and is_default = true;
  end if;

  return new;
end;
$$;

drop trigger if exists clear_other_default_user_vehicles_before_write on public.user_vehicles;
create trigger clear_other_default_user_vehicles_before_write
before insert or update on public.user_vehicles
for each row execute function public.clear_other_default_user_vehicles();

drop trigger if exists set_user_vehicles_updated_at on public.user_vehicles;
create trigger set_user_vehicles_updated_at
before update on public.user_vehicles
for each row execute function public.set_updated_at();

alter table public.user_vehicles enable row level security;

drop policy if exists user_vehicles_read_own on public.user_vehicles;
create policy user_vehicles_read_own on public.user_vehicles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_vehicles_insert_own on public.user_vehicles;
create policy user_vehicles_insert_own on public.user_vehicles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists user_vehicles_update_own on public.user_vehicles;
create policy user_vehicles_update_own on public.user_vehicles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_vehicles_delete_own on public.user_vehicles;
create policy user_vehicles_delete_own on public.user_vehicles
  for delete
  to authenticated
  using (auth.uid() = user_id);
