create or replace function expire_stale_walk_in_entry_passes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation reservations%rowtype;
  v_expired_count integer := 0;
  v_slot_released boolean;
begin
  for v_reservation in
    select r.*
    from reservations r
    where r.source = 'walk_in'
      and r.status = 'confirmed'
      and r.expires_at <= now()
      and not exists (
        select 1
        from parking_sessions s
        where s.reservation_id = r.id
      )
    order by r.expires_at, r.id
    for update of r skip locked
  loop
    -- Serialize with session start before changing the held inventory.
    perform 1
    from parking_slots ps
    where ps.id = v_reservation.slot_id
    for update;

    update reservations
    set status = 'expired'
    where id = v_reservation.id
      and source = 'walk_in'
      and status = 'confirmed'
      and expires_at <= now()
      and not exists (
        select 1
        from parking_sessions s
        where s.reservation_id = v_reservation.id
      );

    if not found then
      continue;
    end if;

    update parking_slots
    set status = 'available'
    where id = v_reservation.slot_id
      and status = 'reserved'
      and not exists (
        select 1
        from parking_sessions s
        where s.slot_id = v_reservation.slot_id
          and s.status in ('active', 'disputed')
      )
      and not exists (
        select 1
        from reservations r
        where r.slot_id = v_reservation.slot_id
          and r.id <> v_reservation.id
          and r.status in ('pending', 'confirmed')
          and r.expires_at > now()
      );

    v_slot_released := found;

    insert into operator_events (
      slot_id,
      reservation_id,
      event_type,
      payload
    ) values (
      v_reservation.slot_id,
      v_reservation.id,
      'walk_in_entry_pass_expired',
      jsonb_build_object(
        'source', 'walk_in',
        'expired_at', now(),
        'scheduled_expires_at', v_reservation.expires_at,
        'slot_released', v_slot_released
      )
    );

    v_expired_count := v_expired_count + 1;
  end loop;

  return v_expired_count;
end;
$$;

revoke all on function expire_stale_walk_in_entry_passes() from public, anon, authenticated;
grant execute on function expire_stale_walk_in_entry_passes() to service_role;
