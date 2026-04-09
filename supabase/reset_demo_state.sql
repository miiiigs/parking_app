begin;

delete from operator_events;
delete from payments;
delete from parking_sessions;
delete from reservations;

update parking_slots
set status = 'available',
    updated_at = now();

insert into operator_events (event_type, payload)
values (
  'demo_state_reset',
  jsonb_build_object(
    'status', 'available',
    'tables_cleared', jsonb_build_array('operator_events', 'payments', 'parking_sessions', 'reservations', 'parking_slots')
  )
);

commit;