alter table parking_sessions
  add column if not exists entry_confirmed_at timestamptz,
  add column if not exists parking_grace_ends_at timestamptz,
  add column if not exists metered_started_at timestamptz;

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

drop function if exists confirm_parking_entry(uuid, uuid);
drop function if exists confirm_parking_entry(uuid, uuid, text);
create or replace function confirm_parking_entry(
  p_reservation_id uuid,
  p_location_id uuid,
  p_entry_token text default null
)
returns table (
  session_id uuid,
  reservation_id uuid,
  slot_id uuid,
  source text,
  session_status text,
  entry_confirmed_at timestamptz,
  parking_grace_ends_at timestamptz,
  metered_started_at timestamptz,
  idempotent_replay boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation reservations%rowtype;
  v_slot parking_slots%rowtype;
  v_walk_in_hub_slot parking_slots%rowtype;
  v_location locations%rowtype;
  v_existing_session parking_sessions%rowtype;
  v_walk_in_token walk_in_entry_pass_tokens%rowtype;
  v_session_id uuid := gen_random_uuid();
  v_confirmed_at timestamptz := now();
  v_grace_ends_at timestamptz;
  v_pricing_config jsonb;
  v_parking_rate numeric(10,2);
  v_entry_token_hash text;
begin
  if p_reservation_id is null or p_location_id is null then
    raise exception 'Reservation and location are required';
  end if;

  select * into v_reservation
  from reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Entry pass not found';
  end if;

  select * into v_location
  from locations
  where id = p_location_id
    and is_active = true;

  if not found then
    raise exception 'Active parking location not found';
  end if;

  if coalesce(v_reservation.source, 'reservation') = 'walk_in' then
    if trim(coalesce(p_entry_token, '')) = '' then
      raise exception 'Legacy walk-in entry pass is no longer accepted';
    end if;

    v_entry_token_hash := encode(digest(trim(p_entry_token), 'sha256'), 'hex');

    select *
      into v_walk_in_token
      from walk_in_entry_pass_tokens
      where reservation_id = p_reservation_id
      for update;

    if not found then
      raise exception 'Walk-in entry token not found';
    end if;

    if v_walk_in_token.expires_at <= v_confirmed_at then
      raise exception 'Walk-in entry pass has expired';
    end if;

    if v_walk_in_token.token_hash <> v_entry_token_hash then
      raise exception 'Walk-in entry token is invalid';
    end if;
  end if;

  select * into v_existing_session
  from parking_sessions
  where parking_sessions.reservation_id = p_reservation_id
  for update;

  if found then
    if v_reservation.status <> 'confirmed' or v_existing_session.status <> 'active' then
      raise exception 'Entry pass is in a terminal state';
    end if;

    if coalesce(v_reservation.source, 'reservation') = 'walk_in' then
      if v_walk_in_token.consumed_at is null then
        update walk_in_entry_pass_tokens
        set consumed_at = v_confirmed_at,
            consumed_by_location_id = p_location_id
        where reservation_id = p_reservation_id;
      elsif v_walk_in_token.consumed_by_location_id is distinct from p_location_id then
        raise exception 'Walk-in entry pass was already used at another location';
      end if;
    end if;

    return query select
      v_existing_session.id,
      v_existing_session.reservation_id,
      v_existing_session.slot_id,
      coalesce(v_reservation.source, 'reservation'),
      v_existing_session.status,
      coalesce(v_existing_session.entry_confirmed_at, v_existing_session.started_at),
      coalesce(v_existing_session.parking_grace_ends_at, v_existing_session.started_at),
      coalesce(v_existing_session.metered_started_at, v_existing_session.started_at),
      true;
    return;
  end if;

  if v_reservation.status <> 'confirmed' then
    raise exception 'Entry pass is not active';
  end if;

  if v_reservation.expires_at <= v_confirmed_at then
    raise exception 'Entry pass has expired';
  end if;

  v_grace_ends_at := v_confirmed_at + make_interval(mins => v_location.entry_grace_minutes);
  v_pricing_config := jsonb_build_object(
    'mode', coalesce(v_location.pricing_mode, 'fixed_rate'),
    'flatRateAmount', coalesce(v_location.flat_rate_amount, 50),
    'fixedRateAmount', coalesce(v_location.fixed_rate_amount, 50),
    'fixedRateIntervalMinutes', greatest(1, coalesce(v_location.fixed_rate_interval_minutes, 60)),
    'firstPeriodMinutes', greatest(1, coalesce(v_location.first_period_minutes, 180)),
    'firstPeriodRate', coalesce(v_location.first_period_rate, 50),
    'succeedingRateAmount', coalesce(v_location.succeeding_rate_amount, 20),
    'succeedingRateIntervalMinutes', greatest(1, coalesce(v_location.succeeding_rate_interval_minutes, 60)),
    'entryGraceMinutes', greatest(0, coalesce(v_location.entry_grace_minutes, 15)),
    'exitGraceMinutes', greatest(0, coalesce(v_location.exit_grace_minutes, 15))
  );
  v_parking_rate := case coalesce(v_location.pricing_mode, 'fixed_rate')
    when 'flat_rate' then coalesce(v_location.flat_rate_amount, 50)
    when 'tiered' then coalesce(v_location.first_period_rate, 50)
    else coalesce(v_location.fixed_rate_amount, 50)
  end;

  if coalesce(v_reservation.source, 'reservation') = 'walk_in' then
    if v_walk_in_token.consumed_at is not null then
      if v_walk_in_token.consumed_by_location_id is distinct from p_location_id then
        raise exception 'Walk-in entry pass was already used at another location';
      end if;

      raise exception 'Walk-in entry pass was already used';
    end if;

    update walk_in_entry_pass_tokens
    set consumed_at = v_confirmed_at,
        consumed_by_location_id = p_location_id
    where reservation_id = p_reservation_id;

    select *
      into v_walk_in_hub_slot
      from parking_slots
      where location_id = p_location_id
        and slot_kind = 'walk_in_hub'
      order by created_at asc
      limit 1
      for update;

    if not found then
      insert into parking_slots (
        location_id,
        slot_label,
        display_order,
        slot_kind,
        status,
        qr_token
      ) values (
        p_location_id,
        'Walk-In Access',
        2147483647,
        'walk_in_hub',
        'occupied',
        'walk-in-hub-' || replace(gen_random_uuid()::text, '-', '')
      )
      returning * into v_walk_in_hub_slot;
    end if;

    update parking_slots
    set status = 'occupied'
    where id = v_walk_in_hub_slot.id;

    insert into parking_sessions (
      id,
      reservation_id,
      slot_id,
      started_at,
      entry_confirmed_at,
      parking_grace_ends_at,
      metered_started_at,
      status,
      billed_minutes,
      billed_amount
    ) values (
      v_session_id,
      p_reservation_id,
      v_walk_in_hub_slot.id,
      v_confirmed_at,
      v_confirmed_at,
      v_grace_ends_at,
      v_grace_ends_at,
      'active',
      0,
      0
    );

    update reservations
    set slot_id = v_walk_in_hub_slot.id,
        parking_rate = v_parking_rate,
        pricing_config = v_pricing_config,
        arrived_at = v_confirmed_at,
        validated_at = v_confirmed_at
    where id = p_reservation_id;

    insert into operator_events (
      slot_id,
      reservation_id,
      session_id,
      event_type,
      payload
    ) values (
      v_walk_in_hub_slot.id,
      p_reservation_id,
      v_session_id,
      'parking_entry_confirmed',
      jsonb_build_object(
        'location_id', p_location_id,
        'source', 'walk_in',
        'entry_confirmed_at', v_confirmed_at,
        'parking_grace_ends_at', v_grace_ends_at,
        'walk_in_hybrid', true
      )
    );

    return query select
      v_session_id,
      p_reservation_id,
      v_walk_in_hub_slot.id,
      'walk_in'::text,
      'active'::text,
      v_confirmed_at,
      v_grace_ends_at,
      v_grace_ends_at,
      false;
    return;
  end if;

  select * into v_slot
  from parking_slots
  where id = v_reservation.slot_id
  for update;

  if not found then
    raise exception 'Reserved slot not found';
  end if;

  if v_slot.location_id <> p_location_id then
    raise exception 'Entry pass does not belong to the active operator location';
  end if;

  if v_slot.status <> 'reserved' then
    raise exception 'Reserved slot is not available for entry confirmation';
  end if;

  insert into parking_sessions (
    id,
    reservation_id,
    slot_id,
    started_at,
    entry_confirmed_at,
    parking_grace_ends_at,
    metered_started_at,
    status,
    billed_minutes,
    billed_amount
  ) values (
    v_session_id,
    p_reservation_id,
    v_reservation.slot_id,
    v_confirmed_at,
    v_confirmed_at,
    v_grace_ends_at,
    v_grace_ends_at,
    'active',
    0,
    0
  );

  update reservations
  set arrived_at = v_confirmed_at,
      validated_at = v_confirmed_at
  where id = p_reservation_id;

  update parking_slots
  set status = 'occupied'
  where id = v_reservation.slot_id;

  insert into operator_events (
    slot_id,
    reservation_id,
    session_id,
    event_type,
    payload
  ) values (
    v_reservation.slot_id,
    p_reservation_id,
    v_session_id,
    'parking_entry_confirmed',
    jsonb_build_object(
      'location_id', p_location_id,
      'source', coalesce(v_reservation.source, 'reservation'),
      'entry_confirmed_at', v_confirmed_at,
      'parking_grace_ends_at', v_grace_ends_at
    )
  );

  return query select
    v_session_id,
    p_reservation_id,
    v_reservation.slot_id,
    coalesce(v_reservation.source, 'reservation'),
    'active'::text,
    v_confirmed_at,
    v_grace_ends_at,
    v_grace_ends_at,
    false;
end;
$$;

revoke all on function confirm_parking_entry(uuid, uuid, text) from public, anon, authenticated;
grant execute on function confirm_parking_entry(uuid, uuid, text) to service_role;
