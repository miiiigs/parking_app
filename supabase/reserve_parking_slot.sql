create or replace function reserve_parking_slot(
  p_slot_id uuid,
  p_user_id uuid,
  p_plate_number text,
  p_arrival_window_minutes integer,
  p_reservation_fee numeric
)
returns table (
  reservation_id uuid,
  slot_id uuid,
  slot_label text,
  slot_status text,
  reservation_status text,
  reserved_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot parking_slots%rowtype;
  v_reservation_id uuid := gen_random_uuid();
  v_user_id uuid := coalesce(auth.uid(), p_user_id, gen_random_uuid());
  v_reserved_at timestamptz := now();
  v_expires_at timestamptz := now() + make_interval(mins => p_arrival_window_minutes);
begin
  if p_arrival_window_minutes <= 0 then
    raise exception 'Arrival window must be greater than zero';
  end if;

  select *
    into v_slot
    from parking_slots
    where id = p_slot_id
    for update;

  if not found then
    raise exception 'Slot not found';
  end if;

  if v_slot.status <> 'available' then
    raise exception 'Slot is not available';
  end if;

  insert into reservations (
    id,
    user_id,
    slot_id,
    plate_number,
    arrival_window_minutes,
    reservation_fee,
    status,
    reserved_at,
    expires_at
  ) values (
    v_reservation_id,
    v_user_id,
    p_slot_id,
    p_plate_number,
    p_arrival_window_minutes,
    p_reservation_fee,
    'confirmed',
    v_reserved_at,
    v_expires_at
  );

  update parking_slots
    set status = 'reserved'
    where id = p_slot_id;

  insert into operator_events (
    slot_id,
    reservation_id,
    event_type,
    payload
  ) values (
    p_slot_id,
    v_reservation_id,
    'reservation_created',
    jsonb_build_object(
      'arrival_window_minutes', p_arrival_window_minutes,
      'reservation_fee', p_reservation_fee,
      'plate_number', p_plate_number
    )
  );

  return query
    select
      v_reservation_id,
      v_slot.id,
      v_slot.slot_label,
      'reserved',
      'confirmed',
      v_reserved_at,
      v_expires_at;
end;
$$;

grant execute on function reserve_parking_slot(uuid, uuid, text, integer, numeric) to anon, authenticated;