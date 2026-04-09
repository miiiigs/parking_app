alter table locations enable row level security;
alter table parking_slots enable row level security;
alter table reservations enable row level security;
alter table parking_sessions enable row level security;
alter table payments enable row level security;
alter table operator_events enable row level security;

drop policy if exists locations_read_public on locations;
create policy locations_read_public on locations
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists parking_slots_read_public on parking_slots;
create policy parking_slots_read_public on parking_slots
  for select
  to anon, authenticated
  using (exists (
    select 1
    from locations
    where locations.id = parking_slots.location_id
      and locations.is_active = true
  ));

drop policy if exists reservations_read_own on reservations;
create policy reservations_read_own on reservations
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists reservations_insert_own on reservations;
create policy reservations_insert_own on reservations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists reservations_update_own on reservations;
create policy reservations_update_own on reservations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists parking_sessions_read_own on parking_sessions;
create policy parking_sessions_read_own on parking_sessions
  for select
  to authenticated
  using (exists (
    select 1
    from reservations
    where reservations.id = parking_sessions.reservation_id
      and reservations.user_id = auth.uid()
  ));

drop policy if exists payments_read_own on payments;
create policy payments_read_own on payments
  for select
  to authenticated
  using (exists (
    select 1
    from reservations
    where reservations.id = payments.reservation_id
      and reservations.user_id = auth.uid()
  ));

drop policy if exists operator_events_admin_only on operator_events;
create policy operator_events_admin_only on operator_events
  for select
  to authenticated
  using (false);