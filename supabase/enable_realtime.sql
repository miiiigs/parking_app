do $$
begin
	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'parking_slots'
	) then
		alter publication supabase_realtime add table public.parking_slots;
	end if;

	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'reservations'
	) then
		alter publication supabase_realtime add table public.reservations;
	end if;

	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'parking_sessions'
	) then
		alter publication supabase_realtime add table public.parking_sessions;
	end if;

	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'payments'
	) then
		alter publication supabase_realtime add table public.payments;
	end if;
end $$;