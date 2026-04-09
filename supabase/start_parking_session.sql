create or replace function start_parking_session(
  p_reservation_id uuid,
  p_slot_qr_token text default null
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
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation reservations%rowtype;
  v_slot parking_slots%rowtype;
  v_existing_session parking_sessions%rowtype;
  v_session_id uuid := gen_random_uuid();
  v_started_at timestamptz := now();
begin
  select *
    into v_reservation
    from reservations
    where id = p_reservation_id
    for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_reservation.status not in ('confirmed') then
    raise exception 'Reservation is not active';
  end if;

  select *
    into v_slot
    from parking_slots
    where id = v_reservation.slot_id
    for update;

  if not found then
    raise exception 'Slot not found';
  end if;

  if p_slot_qr_token is not null and v_slot.qr_token <> p_slot_qr_token then
    raise exception 'Slot QR does not match the reservation';
  end if;

  select *
    into v_existing_session
    from parking_sessions
    where parking_sessions.reservation_id = p_reservation_id
    limit 1;

  if found then
    return query
      select
        v_existing_session.id,
        v_existing_session.reservation_id,
        v_existing_session.slot_id,
        v_slot.slot_label,
        v_slot.status,
        v_reservation.status,
        v_existing_session.status,
        v_existing_session.started_at,
        v_reservation.validated_at,
        v_existing_session.ended_at,
        v_reservation.plate_number,
        v_reservation.reservation_fee,
        v_existing_session.billed_minutes,
        v_existing_session.billed_amount,
        null::text;

    return;
  end if;

  update reservations
    set arrived_at = v_started_at,
        validated_at = v_started_at,
        status = 'confirmed'
    where id = p_reservation_id;

  update parking_slots
    set status = 'occupied'
    where id = v_reservation.slot_id;

  insert into parking_sessions (
    id,
    reservation_id,
    slot_id,
    started_at,
    status,
    billed_minutes,
    billed_amount
  ) values (
    v_session_id,
    p_reservation_id,
    v_reservation.slot_id,
    v_started_at,
    'active',
    0,
    0
  );

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
    'parking_session_started',
    jsonb_build_object(
      'plate_number', v_reservation.plate_number,
      'reservation_fee', v_reservation.reservation_fee
    )
  );

  return query
    select
      v_session_id,
      p_reservation_id,
      v_reservation.slot_id,
      v_slot.slot_label,
      v_slot.status,
      v_reservation.status,
      'active',
      v_started_at,
      v_started_at,
      null::timestamptz,
      v_reservation.plate_number,
      v_reservation.reservation_fee,
      null::integer,
      null::numeric,
      null::text;
end;
$$;

grant execute on function start_parking_session(uuid, text) to anon, authenticated;