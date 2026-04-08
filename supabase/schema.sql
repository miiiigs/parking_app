create extension if not exists pgcrypto;

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text not null,
  city text not null default 'Bonifacio Global City',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists parking_slots (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  slot_label text not null,
  display_order integer not null,
  status text not null default 'available' check (status in ('available', 'reserved', 'occupied', 'blocked', 'disputed')),
  qr_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, slot_label)
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  slot_id uuid not null references parking_slots(id) on delete restrict,
  plate_number text not null,
  arrival_window_minutes integer not null,
  reservation_fee numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'expired', 'cancelled', 'no_show')),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  arrived_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists parking_sessions (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references reservations(id) on delete cascade,
  slot_id uuid not null references parking_slots(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'disputed')),
  billed_minutes integer,
  billed_amount numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references parking_sessions(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete cascade,
  provider text not null check (provider in ('gcash', 'maya', 'manual', 'paymongo')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  reference text,
  amount numeric(10,2) not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists operator_events (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references parking_slots(id) on delete set null,
  reservation_id uuid references reservations(id) on delete set null,
  session_id uuid references parking_sessions(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_locations_updated_at
before update on locations
for each row execute function set_updated_at();

create trigger set_parking_slots_updated_at
before update on parking_slots
for each row execute function set_updated_at();

create trigger set_reservations_updated_at
before update on reservations
for each row execute function set_updated_at();

create trigger set_parking_sessions_updated_at
before update on parking_sessions
for each row execute function set_updated_at();

create trigger set_payments_updated_at
before update on payments
for each row execute function set_updated_at();
