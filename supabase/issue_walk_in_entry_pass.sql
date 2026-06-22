drop function if exists issue_walk_in_entry_pass(uuid, text, integer);

create or replace function issue_walk_in_entry_pass(
  p_slot_id uuid,
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
  pricing_config jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot parking_slots%rowtype;
  v_location locations%rowtype;
  v_reservation_id uuid := gen_random_uuid();
  v_user_id uuid := auth.uid();
  v_reserved_at timestamptz := now();
  v_hold_minutes integer := greatest(1, least(coalesce(p_hold_minutes, 10), 30));
  v_expires_at timestamptz := now() + make_interval(mins => v_hold_minutes);
  v_pricing_config jsonb;
  v_parking_rate numeric(10,2);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if trim(coalesce(p_plate_number, '')) = '' then
    raise exception 'Plate number is required';
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

  select *
    into v_location
    from locations
    where id = v_slot.location_id
    for update;

  if not found then
    raise exception 'Parking location not found';
  end if;

  if exists (
    select 1
    from reservations r
    where r.user_id = v_user_id
      and r.source = 'walk_in'
      and r.status = 'confirmed'
      and r.expires_at > now()
      and exists (
        select 1
        from parking_slots ps
        where ps.id = r.slot_id
          and ps.location_id = v_location.id
      )
      and not exists (
        select 1
        from parking_sessions s
        where s.reservation_id = r.id
          and s.status = 'active'
      )
  ) then
    raise exception 'You already have an active walk-in entry pass for this location';
  end if;

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
    p_slot_id,
    'walk_in',
    p_plate_number,
    v_hold_minutes,
    0,
    v_parking_rate,
    v_pricing_config,
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
    'walk_in_entry_pass_issued',
    jsonb_build_object(
      'source', 'walk_in',
      'hold_minutes', v_hold_minutes,
      'plate_number', p_plate_number,
      'parking_rate', v_parking_rate,
      'pricing_config', v_pricing_config
    )
  );

  return query
    select
      v_reservation_id,
      v_slot.id,
      v_slot.slot_label,
      'reserved',
      'confirmed',
      'walk_in',
      v_reserved_at,
      v_expires_at,
      v_hold_minutes,
      0::numeric,
      v_parking_rate,
      v_pricing_config;
end;
$$;

grant execute on function issue_walk_in_entry_pass(uuid, text, integer) to anon, authenticated;
