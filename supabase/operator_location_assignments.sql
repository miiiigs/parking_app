create table if not exists operator_location_assignments (
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, location_id)
);

alter table operator_location_assignments enable row level security;

drop policy if exists operator_location_assignments_read_own on operator_location_assignments;
create policy operator_location_assignments_read_own on operator_location_assignments
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table operator_location_assignments from anon, authenticated;
grant select on table operator_location_assignments to authenticated;

-- Provision assignments deliberately after the operator Auth user and location exist.
-- Example (replace both values):
-- insert into operator_location_assignments (user_id, location_id, assigned_by)
-- values ('operator-user-uuid', 'location-uuid', 'admin-user-uuid')
-- on conflict (user_id, location_id) do nothing;
