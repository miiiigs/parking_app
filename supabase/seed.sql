insert into locations (id, name, code, address, city)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'BGC Pilot Site',
    'bgc-pilot',
    'Bonifacio Global City, Taguig',
    'Bonifacio Global City'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Makati Business Hub',
    'makati-business-hub',
    'Ayala Avenue, Makati',
    'Makati'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Ortigas Center Deck',
    'ortigas-center-deck',
    'ADB Avenue, Ortigas Center',
    'Pasig'
  )
on conflict (code) do nothing;

do $$
declare
  slot_index integer;
  seeded_location record;
begin
  for seeded_location in
    select *
    from (values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'bgc-pilot', 20),
      ('22222222-2222-4222-8222-222222222222'::uuid, 'makati-business-hub', 12),
      ('33333333-3333-4333-8333-333333333333'::uuid, 'ortigas-center-deck', 12)
    ) as location_seed(id, code, slot_count)
  loop
    for slot_index in 1..seeded_location.slot_count loop
      insert into parking_slots (
        location_id,
        slot_label,
        display_order,
        status,
        qr_token
      )
      values (
        seeded_location.id,
        'Slot #' || slot_index,
        slot_index,
        'available',
        seeded_location.code || '-slot-' || slot_index
      )
      on conflict do nothing;
    end loop;
  end loop;
end $$;
