create table if not exists walk_in_entry_pass_tokens (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references reservations(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by_location_id uuid references locations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists walk_in_entry_pass_tokens_expires_at_idx
  on walk_in_entry_pass_tokens (expires_at);

drop trigger if exists set_walk_in_entry_pass_tokens_updated_at on walk_in_entry_pass_tokens;
create trigger set_walk_in_entry_pass_tokens_updated_at
before update on walk_in_entry_pass_tokens
for each row execute function set_updated_at();

alter table walk_in_entry_pass_tokens enable row level security;
alter table reservations
  alter column slot_id drop not null;

drop function if exists issue_walk_in_entry_pass(uuid, text, integer);
drop function if exists issue_walk_in_entry_pass(text, integer);

create or replace function issue_walk_in_entry_pass(
  p_plate_number text,
  p_hold_minutes integer default 10
)
returns table (
  reservation_id uuid,
  slot_id uuid,
  slot_label text,
  slot_status text,
  reservation_status text,
  source text,
  reserved_at timestamptz,
  expires_at timestamptz,
  arrival_window_minutes integer,
  reservation_fee numeric,
  parking_rate numeric,
  pricing_config jsonb,
  entry_token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation_id uuid := gen_random_uuid();
  v_user_id uuid := auth.uid();
  v_reserved_at timestamptz := now();
  v_hold_minutes integer := greatest(1, least(coalesce(p_hold_minutes, 10), 30));
  v_expires_at timestamptz := now() + make_interval(mins => v_hold_minutes);
  v_existing_reservation reservations%rowtype;
  v_existing_slot parking_slots%rowtype;
  v_entry_token text := encode(extensions.gen_random_bytes(18), 'hex');
  v_entry_token_hash text := encode(extensions.digest(v_entry_token, 'sha256'), 'hex');
  v_pricing_config jsonb := jsonb_build_object(
    'mode', 'fixed_rate',
    'flatRateAmount', 50,
    'fixedRateAmount', 50,
    'fixedRateIntervalMinutes', 60,
    'firstPeriodMinutes', 180,
    'firstPeriodRate', 50,
    'succeedingRateAmount', 20,
    'succeedingRateIntervalMinutes', 60,
    'entryGraceMinutes', 15,
    'exitGraceMinutes', 15
  );
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if trim(coalesce(p_plate_number, '')) = '' then
    raise exception 'Plate number is required';
  end if;

  select *
    into v_existing_reservation
    from reservations r
    where r.user_id = v_user_id
      and r.source = 'walk_in'
      and r.status = 'confirmed'
      and r.expires_at > now()
      and not exists (
        select 1
        from parking_sessions s
        where s.reservation_id = r.id
          and s.status = 'active'
      )
    order by r.reserved_at desc
    limit 1
    for update;

  if found then
    v_reservation_id := v_existing_reservation.id;
    v_reserved_at := v_existing_reservation.reserved_at;
    v_expires_at := v_existing_reservation.expires_at;
    v_hold_minutes := greatest(1, coalesce(v_existing_reservation.arrival_window_minutes, v_hold_minutes));
    v_pricing_config := coalesce(nullif(v_existing_reservation.pricing_config, '{}'::jsonb), v_pricing_config);

    update reservations
    set plate_number = p_plate_number
    where id = v_existing_reservation.id;

    insert into walk_in_entry_pass_tokens (
      reservation_id,
      token_hash,
      expires_at,
      consumed_at,
      consumed_by_location_id
    ) values (
      v_existing_reservation.id,
      v_entry_token_hash,
      v_existing_reservation.expires_at,
      null,
      null
    )
    on conflict on constraint walk_in_entry_pass_tokens_reservation_id_key do update
      set token_hash = excluded.token_hash,
          expires_at = excluded.expires_at,
          consumed_at = null,
          consumed_by_location_id = null;

    if v_existing_reservation.slot_id is not null then
      select *
        into v_existing_slot
        from parking_slots
        where id = v_existing_reservation.slot_id;
    end if;

    return query
      select
        v_existing_reservation.id,
        v_existing_reservation.slot_id,
        coalesce(v_existing_slot.slot_label, 'Any supported lot'),
        coalesce(v_existing_slot.status, 'pending_assignment'),
        v_existing_reservation.status,
        'walk_in',
        v_existing_reservation.reserved_at,
        v_existing_reservation.expires_at,
        coalesce(v_existing_reservation.arrival_window_minutes, v_hold_minutes),
        coalesce(v_existing_reservation.reservation_fee, 0)::numeric,
        coalesce(v_existing_reservation.parking_rate, 0)::numeric,
        v_pricing_config,
        v_entry_token;
    return;
  end if;

  insert into reservations (
    id,
    user_id,
    slot_id,
    source,
    plate_number,
    arrival_window_minutes,
    reservation_fee,
    parking_rate,
    pricing_config,
    status,
    reserved_at,
    expires_at
  ) values (
    v_reservation_id,
    v_user_id,
    null,
    'walk_in',
    p_plate_number,
    v_hold_minutes,
    0,
    0,
    v_pricing_config,
    'confirmed',
    v_reserved_at,
    v_expires_at
  );

  insert into walk_in_entry_pass_tokens (
    reservation_id,
    token_hash,
    expires_at
  ) values (
    v_reservation_id,
    v_entry_token_hash,
    v_expires_at
  );

  insert into operator_events (
    slot_id,
    reservation_id,
    event_type,
    payload
  ) values (
    null,
    v_reservation_id,
    'walk_in_entry_pass_issued',
    jsonb_build_object(
      'source', 'walk_in',
      'scope', 'multi_location',
      'hold_minutes', v_hold_minutes,
      'plate_number', p_plate_number,
      'pricing_config', v_pricing_config
    )
  );

  return query
    select
      v_reservation_id,
      null::uuid,
      'Any supported lot',
      'pending_assignment',
      'confirmed',
      'walk_in',
      v_reserved_at,
      v_expires_at,
      v_hold_minutes,
      0::numeric,
      0::numeric,
      v_pricing_config,
      v_entry_token;
end;
$$;

grant execute on function issue_walk_in_entry_pass(text, integer) to anon, authenticated;
