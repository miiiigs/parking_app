alter table parking_sessions
  add column if not exists entry_confirmed_at timestamptz,
  add column if not exists parking_grace_ends_at timestamptz,
  add column if not exists metered_started_at timestamptz;

drop function if exists confirm_parking_entry(uuid, uuid);

create or replace function confirm_parking_entry(
  p_reservation_id uuid,
  p_location_id uuid
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
  v_location locations%rowtype;
  v_existing_session parking_sessions%rowtype;
  v_session_id uuid := gen_random_uuid();
  v_confirmed_at timestamptz := now();
  v_grace_ends_at timestamptz;
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

  select * into v_location
  from locations
  where id = p_location_id
    and is_active = true;

  if not found then
    raise exception 'Active parking location not found';
  end if;

  select * into v_existing_session
  from parking_sessions
  where parking_sessions.reservation_id = p_reservation_id
  for update;

  if found then
    if v_reservation.status <> 'confirmed' or v_existing_session.status <> 'active' then
      raise exception 'Entry pass is in a terminal state';
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

  if v_slot.status <> 'reserved' then
    raise exception 'Reserved slot is not available for entry confirmation';
  end if;

  v_grace_ends_at := v_confirmed_at + make_interval(mins => v_location.entry_grace_minutes);

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

revoke all on function confirm_parking_entry(uuid, uuid) from public, anon, authenticated;
grant execute on function confirm_parking_entry(uuid, uuid) to service_role;
