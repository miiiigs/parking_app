create extension if not exists pgcrypto;

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text not null,
  city text not null default 'Bonifacio Global City',
  pricing_mode text not null default 'fixed_rate' check (pricing_mode in ('flat_rate', 'fixed_rate', 'tiered')),
  flat_rate_amount numeric(10,2) not null default 50,
  fixed_hourly_rate numeric(10,2) not null default 50,
  first_period_hours integer not null default 3 check (first_period_hours >= 1),
  first_period_rate numeric(10,2) not null default 50,
  succeeding_hourly_rate numeric(10,2) not null default 20,
  entry_grace_minutes integer not null default 15 check (entry_grace_minutes >= 0 and entry_grace_minutes <= 120),
  exit_grace_minutes integer not null default 15 check (exit_grace_minutes >= 0 and exit_grace_minutes <= 120),
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
  parking_rate numeric(10,2) not null default 50,
  pricing_config jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'expired', 'cancelled', 'no_show')),
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

create or replace function calculate_parking_fee(
  p_elapsed_minutes integer,
  p_parking_rate numeric
)
returns numeric(10,2)
language plpgsql
immutable
as $$
declare
  v_rate numeric(10,2) := coalesce(p_parking_rate, 50);
  v_elapsed_minutes integer := greatest(0, coalesce(p_elapsed_minutes, 0));
begin
  return round(greatest((v_elapsed_minutes / 60.0) * v_rate, v_rate * 0.25)::numeric, 2);
end;
$$;

create or replace function calculate_parking_fee_from_config(
  p_elapsed_minutes integer,
  p_pricing_config jsonb
)
returns numeric(10,2)
language plpgsql
immutable
as $$
declare
  v_config jsonb := coalesce(p_pricing_config, '{}'::jsonb);
  v_mode text := coalesce(v_config->>'mode', 'fixed_rate');
  v_flat_rate numeric(10,2) := greatest(0, coalesce((v_config->>'flatRateAmount')::numeric, 50));
  v_fixed_hourly_rate numeric(10,2) := greatest(0, coalesce((v_config->>'fixedHourlyRate')::numeric, 50));
  v_first_period_hours integer := greatest(1, coalesce((v_config->>'firstPeriodHours')::integer, 3));
  v_first_period_rate numeric(10,2) := greatest(0, coalesce((v_config->>'firstPeriodRate')::numeric, 50));
  v_succeeding_hourly_rate numeric(10,2) := greatest(0, coalesce((v_config->>'succeedingHourlyRate')::numeric, 20));
  v_entry_grace_minutes integer := greatest(0, coalesce((v_config->>'entryGraceMinutes')::integer, 15));
  v_elapsed_minutes integer := greatest(0, coalesce(p_elapsed_minutes, 0));
  v_billable_minutes integer := greatest(0, v_elapsed_minutes - v_entry_grace_minutes);
  v_extra_minutes integer;
  v_extra_hours integer;
  v_amount numeric(10,2);
begin
  if v_mode = 'flat_rate' then
    return round(v_flat_rate, 2);
  end if;

  if v_mode = 'tiered' then
    v_extra_minutes := greatest(0, v_billable_minutes - (v_first_period_hours * 60));
    v_extra_hours := case when v_extra_minutes > 0 then ceil(v_extra_minutes / 60.0)::integer else 0 end;
    v_amount := v_first_period_rate + (v_extra_hours * v_succeeding_hourly_rate);
    return round(v_amount, 2);
  end if;

  v_amount := greatest(1, ceil(greatest(1, v_billable_minutes) / 60.0)::integer) * v_fixed_hourly_rate;
  return round(v_amount, 2);
end;
$$;

create trigger set_parking_sessions_updated_at
before update on parking_sessions
for each row execute function set_updated_at();

create trigger set_payments_updated_at
before update on payments
for each row execute function set_updated_at();

alter table locations enable row level security;
alter table parking_slots enable row level security;
alter table reservations enable row level security;
alter table parking_sessions enable row level security;
alter table payments enable row level security;
alter table operator_events enable row level security;

drop policy if exists locations_read_public on locations;
create policy locations_read_public on locations
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists parking_slots_read_public on parking_slots;
create policy parking_slots_read_public on parking_slots
  for select
  to anon, authenticated
  using (exists (
    select 1
    from locations
    where locations.id = parking_slots.location_id
      and locations.is_active = true
  ));

drop policy if exists reservations_read_own on reservations;
create policy reservations_read_own on reservations
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists reservations_insert_own on reservations;
create policy reservations_insert_own on reservations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists reservations_update_own on reservations;
create policy reservations_update_own on reservations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists parking_sessions_read_own on parking_sessions;
create policy parking_sessions_read_own on parking_sessions
  for select
  to authenticated
  using (exists (
    select 1
    from reservations
    where reservations.id = parking_sessions.reservation_id
      and reservations.user_id = auth.uid()
  ));

drop policy if exists payments_read_own on payments;
create policy payments_read_own on payments
  for select
  to authenticated
  using (exists (
    select 1
    from reservations
    where reservations.id = payments.reservation_id
      and reservations.user_id = auth.uid()
  ));

drop policy if exists operator_events_admin_only on operator_events;
create policy operator_events_admin_only on operator_events
  for select
  to authenticated
  using (false);

drop function if exists end_parking_session(uuid, integer, numeric, text);

create or replace function end_parking_session(
  p_reservation_id uuid,
  p_billed_minutes integer default null,
  p_billed_amount numeric default null,
  p_payment_reference text default 'mobile_mark_paid'
)
returns table (
  session_id uuid,
  reservation_id uuid,
  slot_id uuid,
  slot_label text,
  slot_status text,
  reservation_status text,
  session_status text,
  started_at timestamptz,
  validated_at timestamptz,
  ended_at timestamptz,
  plate_number text,
  reservation_fee numeric,
  billed_minutes integer,
  billed_amount numeric,
  payment_status text,
  pricing_config jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session parking_sessions%rowtype;
  v_reservation reservations%rowtype;
  v_slot parking_slots%rowtype;
  v_ended_at timestamptz := now();
  v_elapsed_minutes integer;
  v_billed_minutes integer;
  v_billed_amount numeric(10,2);
  v_pricing_config jsonb;
begin
  select *
    into v_session
    from parking_sessions
    where parking_sessions.reservation_id = p_reservation_id
    for update;

  if not found then
    raise exception 'Parking session not found';
  end if;

  select *
    into v_reservation
    from reservations
    where id = p_reservation_id
    for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  select *
    into v_slot
    from parking_slots
    where id = v_session.slot_id
    for update;

  if not found then
    raise exception 'Slot not found';
  end if;

  v_pricing_config := coalesce(
    nullif(v_reservation.pricing_config, '{}'::jsonb),
    jsonb_build_object(
      'mode', 'fixed_rate',
      'flatRateAmount', coalesce(v_reservation.parking_rate, 50),
      'fixedHourlyRate', coalesce(v_reservation.parking_rate, 50),
      'firstPeriodHours', 3,
      'firstPeriodRate', coalesce(v_reservation.parking_rate, 50),
      'succeedingHourlyRate', 20,
      'entryGraceMinutes', 15,
      'exitGraceMinutes', 15
    )
  );

  if v_session.status = 'completed' then
    return query
      select
        v_session.id,
        v_session.reservation_id,
        v_session.slot_id,
        v_slot.slot_label,
        v_slot.status,
        v_reservation.status,
        v_session.status,
        v_session.started_at,
        v_reservation.validated_at,
        v_session.ended_at,
        v_reservation.plate_number,
        v_reservation.reservation_fee,
        v_session.billed_minutes,
        v_session.billed_amount,
        coalesce((select payments.status from payments where payments.session_id = v_session.id order by payments.paid_at desc nulls last, payments.created_at desc limit 1), 'paid'),
        v_pricing_config;

    return;
  end if;

  if v_session.status <> 'active' then
    raise exception 'Parking session is not active';
  end if;

  v_elapsed_minutes := greatest(0, floor(extract(epoch from (v_ended_at - v_session.started_at)) / 60.0)::integer);
  v_billed_minutes := greatest(0, v_elapsed_minutes - greatest(0, coalesce((v_pricing_config->>'entryGraceMinutes')::integer, 15)));
  v_billed_amount := coalesce(p_billed_amount, calculate_parking_fee_from_config(v_elapsed_minutes, v_pricing_config));

  update parking_sessions
    set status = 'completed',
        ended_at = v_ended_at,
        billed_minutes = coalesce(p_billed_minutes, v_billed_minutes),
        billed_amount = v_billed_amount
    where id = v_session.id;

  update reservations
    set status = 'completed'
    where id = p_reservation_id;

  update parking_slots
    set status = 'available'
    where id = v_session.slot_id;

  insert into payments (
    session_id,
    reservation_id,
    provider,
    status,
    reference,
    amount,
    paid_at
  ) values (
    v_session.id,
    p_reservation_id,
    'manual',
    'paid',
    p_payment_reference,
    v_billed_amount,
    v_ended_at
  );

  insert into operator_events (
    slot_id,
    reservation_id,
    session_id,
    event_type,
    payload
  ) values (
    v_session.slot_id,
    p_reservation_id,
    v_session.id,
    'parking_session_completed',
    jsonb_build_object(
      'billed_minutes', coalesce(p_billed_minutes, v_billed_minutes),
      'billed_amount', v_billed_amount,
      'payment_status', 'paid',
      'payment_reference', p_payment_reference,
      'pricing_config', v_pricing_config
    )
  );

  return query
    select
      v_session.id,
      v_session.reservation_id,
      v_session.slot_id,
      v_slot.slot_label,
      'available',
      v_reservation.status,
      'completed',
      v_session.started_at,
      v_reservation.validated_at,
      v_ended_at,
      v_reservation.plate_number,
      v_reservation.reservation_fee,
      coalesce(p_billed_minutes, v_billed_minutes),
      v_billed_amount,
      'paid',
      v_pricing_config;
end;
$$;

grant execute on function end_parking_session(uuid, integer, numeric, text) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'parking_slots'
  ) then
    alter publication supabase_realtime add table public.parking_slots;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reservations'
  ) then
    alter publication supabase_realtime add table public.reservations;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'parking_sessions'
  ) then
    alter publication supabase_realtime add table public.parking_sessions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;
