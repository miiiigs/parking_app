-- Run only after enabling the pg_cron extension in the target Supabase project.
-- This is intentionally separate from schema bootstrap because scheduler activation
-- is an environment operation that must first be rehearsed in staging.
do $$
begin
  if not exists (
    select 1
    from pg_extension
    where extname = 'pg_cron'
  ) then
    raise exception 'Enable the pg_cron extension before scheduling walk-in cleanup';
  end if;

  if not exists (
    select 1
    from cron.job
    where jobname = 'expire-stale-walk-in-entry-passes'
  ) then
    perform cron.schedule(
      'expire-stale-walk-in-entry-passes',
      '* * * * *',
      'select public.expire_stale_walk_in_entry_passes();'
    );
  end if;
end;
$$;

-- Rollback:
-- select cron.unschedule('expire-stale-walk-in-entry-passes');
