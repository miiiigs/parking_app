create table if not exists admin_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'operator', 'support', 'finance')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_admin_user_roles_updated_at
before update on admin_user_roles
for each row execute function set_updated_at();

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('insert', 'update', 'delete', 'reconcile_fix', 'manual_override')),
  actor_user_id uuid references auth.users(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  run_status text not null check (run_status in ('running', 'completed', 'failed')),
  mismatch_count integer not null default 0,
  fixed_count integer not null default 0,
  message text,
  created_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table admin_user_roles enable row level security;
alter table admin_audit_log enable row level security;
alter table reconciliation_runs enable row level security;

drop policy if exists admin_user_roles_read_own on admin_user_roles;
create policy admin_user_roles_read_own on admin_user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists admin_audit_log_read_admin on admin_audit_log;
create policy admin_audit_log_read_admin on admin_audit_log
  for select
  to authenticated
  using (exists (
    select 1
    from admin_user_roles
    where admin_user_roles.user_id = auth.uid()
      and admin_user_roles.role in ('admin', 'operator', 'support', 'finance')
  ));

drop policy if exists reconciliation_runs_read_admin on reconciliation_runs;
create policy reconciliation_runs_read_admin on reconciliation_runs
  for select
  to authenticated
  using (exists (
    select 1
    from admin_user_roles
    where admin_user_roles.user_id = auth.uid()
      and admin_user_roles.role in ('admin', 'operator', 'support', 'finance')
  ));

create or replace function log_admin_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_record_id uuid;
begin
  if tg_op = 'DELETE' then
    v_record_id := old.id;
  else
    v_record_id := new.id;
  end if;

  insert into admin_audit_log (
    table_name,
    record_id,
    action,
    actor_user_id,
    before_data,
    after_data,
    metadata
  ) values (
    tg_table_name,
    v_record_id,
    lower(tg_op),
    v_actor,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    jsonb_build_object('source', 'trigger')
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists audit_parking_slots on parking_slots;
create trigger audit_parking_slots
after insert or update or delete on parking_slots
for each row execute function log_admin_audit_change();

drop trigger if exists audit_reservations on reservations;
create trigger audit_reservations
after insert or update or delete on reservations
for each row execute function log_admin_audit_change();

drop trigger if exists audit_parking_sessions on parking_sessions;
create trigger audit_parking_sessions
after insert or update or delete on parking_sessions
for each row execute function log_admin_audit_change();

drop trigger if exists audit_payments on payments;
create trigger audit_payments
after insert or update or delete on payments
for each row execute function log_admin_audit_change();

create or replace function reconcile_parking_state()
returns table (
  slot_id uuid,
  slot_label text,
  previous_status text,
  fixed_status text,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_mismatch_count integer := 0;
  v_fixed_count integer := 0;
begin
  insert into reconciliation_runs (
    id,
    run_status,
    mismatch_count,
    fixed_count,
    message,
    created_by,
    started_at
  ) values (
    v_run_id,
    'running',
    0,
    0,
    null,
    auth.uid(),
    now()
  );

  with expected as (
    select
      s.id as slot_id,
      s.slot_label,
      s.status as previous_status,
      case
        when exists (
          select 1
          from parking_sessions ps
          where ps.slot_id = s.id
            and ps.status = 'active'
        ) then 'occupied'
        when exists (
          select 1
          from reservations r
          where r.slot_id = s.id
            and r.status = 'confirmed'
        ) then 'reserved'
        when s.status in ('blocked', 'disputed') then 'blocked'
        else 'available'
      end as fixed_status,
      case
        when exists (
          select 1
          from parking_sessions ps
          where ps.slot_id = s.id
            and ps.status = 'active'
        ) then 'active session'
        when exists (
          select 1
          from reservations r
          where r.slot_id = s.id
            and r.status = 'confirmed'
        ) then 'confirmed reservation'
        when s.status in ('blocked', 'disputed') then 'blocked state'
        else 'availability reset'
      end as reason
    from parking_slots s
  ), updated as (
    update parking_slots s
      set status = expected.fixed_status
      from expected
      where s.id = expected.slot_id
        and s.status <> expected.fixed_status
      returning s.id
  )
  select count(*) into v_fixed_count from updated;

  select count(*) into v_mismatch_count
  from parking_slots s
  where s.status <> (
    case
      when exists (
        select 1
        from parking_sessions ps
        where ps.slot_id = s.id
          and ps.status = 'active'
      ) then 'occupied'
      when exists (
        select 1
        from reservations r
        where r.slot_id = s.id
          and r.status = 'confirmed'
      ) then 'reserved'
      when s.status in ('blocked', 'disputed') then 'blocked'
      else 'available'
    end
  );

  update reconciliation_runs
    set run_status = 'completed',
        mismatch_count = v_mismatch_count,
        fixed_count = v_fixed_count,
        completed_at = now(),
        message = case when v_fixed_count = 0 then 'No mismatches found.' else 'Reconciliation applied successfully.' end
    where id = v_run_id;

  return query
  with expected as (
    select
      s.id as slot_id,
      s.slot_label,
      s.status as previous_status,
      case
        when exists (
          select 1
          from parking_sessions ps
          where ps.slot_id = s.id
            and ps.status = 'active'
        ) then 'occupied'
        when exists (
          select 1
          from reservations r
          where r.slot_id = s.id
            and r.status = 'confirmed'
        ) then 'reserved'
        when s.status in ('blocked', 'disputed') then 'blocked'
        else 'available'
      end as fixed_status,
      case
        when exists (
          select 1
          from parking_sessions ps
          where ps.slot_id = s.id
            and ps.status = 'active'
        ) then 'active session'
        when exists (
          select 1
          from reservations r
          where r.slot_id = s.id
            and r.status = 'confirmed'
        ) then 'confirmed reservation'
        when s.status in ('blocked', 'disputed') then 'blocked state'
        else 'availability reset'
      end as reason
    from parking_slots s
  )
  select
    expected.slot_id,
    expected.slot_label,
    expected.previous_status,
    expected.fixed_status,
    expected.reason
  from expected
  where expected.previous_status <> expected.fixed_status;

exception
  when others then
    update reconciliation_runs
      set run_status = 'failed',
          completed_at = now(),
          message = sqlerrm
      where id = v_run_id;

    raise;
end;
$$;

grant execute on function reconcile_parking_state() to anon, authenticated;
