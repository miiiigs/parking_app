# Supabase Backend Plan

This project uses Supabase as the source of truth for:

- Authentication
- Slot and reservation records
- Realtime slot updates
- Session state transitions
- Storage for proof-of-payment or QR assets if needed

Recommended next step:

- Define the initial Postgres schema for locations, slots, reservations, sessions, payments, and operator actions.
- Add row-level security policies before any production pilot.

Auth and RLS setup:

- Enable anonymous sign-in in the Supabase Auth dashboard for the mobile app.
- Create at least one admin user in Supabase Auth for dashboard access.
- Admin access is protected by middleware and a login page in the Next.js app.
- Run the schema file for fresh installs, then run the RLS file to lock down table access.
- Run the admin hardening file to create admin roles, audit logs, and reconciliation support.
- Run the bootstrap admin role SQL once for the first dashboard user, then edit the email placeholder to match your real admin account.
- Mobile users sign in anonymously and can only read their own reservations and sessions.
- Admin server actions still use the service role key, so keep that key server-side only.

Parking lot layouts (admin builder → mobile map):

- Run `parking_lot_layouts.sql` to create the layout storage table.
- Re-run `mobile_dashboard_snapshot.sql` so the mobile RPC returns `lotLayout`.
- Save from the admin **Lot Builder** (`Save to Supabase`); mobile loads the layout on the next dashboard refresh.

Backup and restore testing:

- Use the backup restore smoke test SQL after restoring a database snapshot.
- Verify counts for locations, slots, reservations, sessions, payments, and audit records.
- Run a reconciliation after restore to repair slot-state drift before operators resume work.

Walk-in expiry cleanup:

- Run `expire_stale_walk_in_entry_passes.sql` after the walk-in support and RPC files.
- Call `select public.expire_stale_walk_in_entry_passes();` in staging to verify expired, unstarted walk-in holds are marked expired and their still-owned slots are released.
- Enable the Supabase `pg_cron` extension, then run `schedule_walk_in_expiry_cleanup.sql` to invoke cleanup once per minute.
- Confirm the `expire-stale-walk-in-entry-passes` job exists and inspect `cron.job_run_details` after at least one execution.
- Roll back scheduler activation with `select cron.unschedule('expire-stale-walk-in-entry-passes');`.
- Do not mark the scheduler active in an environment until the job and its audit events have been observed there.

Gate entry confirmation:

- Run `operator_location_assignments.sql` after `admin_hardening.sql`, then provision each operator/location pair deliberately. A selected location is not mutation authorization.
- Run `confirm_parking_entry.sql` after the reservation and legacy session RPC files. It adds durable entry-confirmation and parking-grace timestamps.
- The operator API calls `confirm_parking_entry` with the service-role key after authenticating the operator and resolving the active location.
- `start_parking_session` and `start_walk_in_session` are retained only for compatibility and are no longer executable by `anon` or `authenticated` roles.
- Verify valid, duplicate-active, expired, cancelled, completed, wrong-location, unauthorized-location, and concurrent scans against a non-production database before promotion.
