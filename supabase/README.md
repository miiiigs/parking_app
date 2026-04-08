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
