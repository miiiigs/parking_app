drop function if exists start_walk_in_session(uuid, text);

create or replace function start_walk_in_session(
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
  source text,
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
  v_reservation reservations%rowtype;
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

  if v_reservation.source <> 'walk_in' then
    raise exception 'Reservation is not a walk-in entry pass';
  end if;

  if v_reservation.status <> 'confirmed' then
    raise exception 'Walk-in entry pass is not active';
  end if;

  if v_reservation.expires_at <= now() then
    raise exception 'Walk-in entry pass has expired';
  end if;

  return query
    select *
    from start_parking_session(p_reservation_id, p_slot_qr_token);

  insert into operator_events (
    slot_id,
    reservation_id,
    session_id,
    event_type,
    payload
  )
  select
    parking_sessions.slot_id,
    parking_sessions.reservation_id,
    parking_sessions.id,
    'walk_in_session_started',
    jsonb_build_object(
      'source', 'walk_in',
      'plate_number', v_reservation.plate_number
    )
  from parking_sessions
  where parking_sessions.reservation_id = p_reservation_id
  order by parking_sessions.created_at desc
  limit 1;
end;
$$;

revoke all on function start_walk_in_session(uuid, text) from public, anon, authenticated;
grant execute on function start_walk_in_session(uuid, text) to service_role;
