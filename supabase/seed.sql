insert into locations (id, name, code, address, city)
values (
  '11111111-1111-1111-1111-111111111111',
  'BGC Pilot Site',
  'bgc-pilot',
  'Bonifacio Global City, Taguig',
  'Bonifacio Global City'
)
on conflict (code) do nothing;

do $$
declare
  slot_index integer;
begin
  for slot_index in 1..20 loop
    insert into parking_slots (
      location_id,
      slot_label,
      display_order,
      status,
      qr_token
    )
    values (
      '11111111-1111-1111-1111-111111111111',
      'Slot #' || slot_index,
      slot_index,
      'available',
      'bgc-pilot-slot-' || slot_index
    )
    on conflict do nothing;
  end loop;
end $$;
