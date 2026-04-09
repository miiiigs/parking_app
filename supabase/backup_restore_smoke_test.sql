select 'locations' as table_name, count(*) as row_count from locations
union all
select 'parking_slots' as table_name, count(*) as row_count from parking_slots
union all
select 'reservations' as table_name, count(*) as row_count from reservations
union all
select 'parking_sessions' as table_name, count(*) as row_count from parking_sessions
union all
select 'payments' as table_name, count(*) as row_count from payments
union all
select 'admin_audit_log' as table_name, count(*) as row_count from admin_audit_log
union all
select 'reconciliation_runs' as table_name, count(*) as row_count from reconciliation_runs;