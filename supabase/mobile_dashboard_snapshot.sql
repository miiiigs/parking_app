create or replace function mobile_dashboard_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location record;
  v_slot record;
  v_slots jsonb := '[]'::jsonb;
  v_reservation record;
  v_session record;
  v_lot_layout jsonb := null;
begin
  select id, name, address, city into v_location
  from locations
  where is_active = true
  order by created_at asc
  limit 1;

  if v_location.id is not null then
    select layout into v_lot_layout
    from parking_lot_layouts
    where location_id = v_location.id
    limit 1;
  end if;

  for v_slot in
    select id, slot_label, status, display_order, qr_token from parking_slots where location_id = v_location.id order by display_order asc
  loop
    v_slots := v_slots || jsonb_build_object(
      'id', v_slot.id,
      'label', v_slot.slot_label,
      'status', v_slot.status,
      'displayOrder', v_slot.display_order,
      'qrToken', v_slot.qr_token
    );
  end loop;

  select * into v_reservation
  from reservations
  where user_id = p_user_id
    and status = 'confirmed'
  order by reserved_at desc
  limit 1;

  if found then
    select * into v_session
    from parking_sessions
    where reservation_id = v_reservation.id
    order by created_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'location', case when v_location is not null then jsonb_build_object('id', v_location.id, 'name', v_location.name, 'address', v_location.address, 'city', v_location.city) else null end,
    'lotLayout', v_lot_layout,
    'slots', v_slots,
    'reservation', case when v_reservation is not null then jsonb_build_object('id', v_reservation.id, 'slot_id', v_reservation.slot_id, 'slot_label', (select slot_label from parking_slots where id = v_reservation.slot_id), 'status', v_reservation.status, 'reserved_at', v_reservation.reserved_at, 'expires_at', v_reservation.expires_at) else null end,
    'session', case when v_session is not null then jsonb_build_object('id', v_session.id, 'reservation_id', v_session.reservation_id, 'slot_id', v_session.slot_id, 'started_at', v_session.started_at, 'ended_at', v_session.ended_at, 'status', v_session.status, 'billed_minutes', v_session.billed_minutes, 'billed_amount', v_session.billed_amount) else null end
  );
end;
$$;

grant execute on function mobile_dashboard_snapshot(uuid) to anon, authenticated;
