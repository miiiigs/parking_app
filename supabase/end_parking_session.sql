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
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

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

  if v_reservation.user_id <> auth.uid() then
    raise exception 'Reservation does not belong to the current user';
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
  v_billed_amount := coalesce(
    p_billed_amount,
    calculate_parking_fee_from_config(v_elapsed_minutes, v_pricing_config)
  );

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
