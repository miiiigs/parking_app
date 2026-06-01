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
