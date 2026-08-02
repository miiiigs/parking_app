drop function if exists cancel_parking_reservation(uuid);

create or replace function cancel_parking_reservation(
  p_reservation_id uuid
)
returns table (
  reservation_id uuid,
  slot_id uuid,
  reservation_status text,
  slot_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation reservations%rowtype;
  v_slot parking_slots%rowtype;
  v_session parking_sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
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

  if v_reservation.status <> 'confirmed' then
    raise exception 'Reservation is not active';
  end if;

  if v_reservation.slot_id is not null then
    select *
      into v_slot
      from parking_slots
      where id = v_reservation.slot_id
      for update;

    if not found then
      raise exception 'Slot not found';
    end if;
  end if;

  select *
    into v_session
    from parking_sessions
    where parking_sessions.reservation_id = p_reservation_id
    limit 1;

  if found and v_session.status = 'active' then
    raise exception 'Cannot cancel a reservation with an active parking session';
  end if;

  update reservations
    set status = 'cancelled'
    where id = p_reservation_id;

  update parking_slots
    set status = 'available'
    where id = v_reservation.slot_id
      and v_reservation.slot_id is not null
      and v_slot.slot_kind = 'standard'
      and not exists (
        select 1
        from parking_sessions
        where parking_sessions.reservation_id = p_reservation_id
          and parking_sessions.status = 'active'
      );

  insert into operator_events (
    slot_id,
    reservation_id,
    event_type,
    payload
  ) values (
    v_reservation.slot_id,
    p_reservation_id,
    'reservation_cancelled',
    jsonb_build_object(
      'plate_number', v_reservation.plate_number,
      'cancelled_by', auth.uid()
    )
  );

  return query
    select
      v_reservation.id,
      v_reservation.slot_id,
      'cancelled',
      case
        when v_reservation.slot_id is null or v_slot.slot_kind <> 'standard' then null
        else 'available'
      end;
end;
$$;

grant execute on function cancel_parking_reservation(uuid) to anon, authenticated;
