# Parking App Operator

Operator dashboard for parking lot operations. This app is the current web frontend for lot monitoring, map management, reconciliation, and operator actions.

## Current Scope

This app is built for:
- authenticated operator access through Supabase Auth
- role-based access for `admin`, `operator`, `support`, and `finance`
- explicit active-location context
- live lot monitoring through the applied parking map
- map drafting, applying, rollback, and audit history
- reservation, session, payment, and audit inspection

This app is not a demo shell anymore. The README below describes the actual runtime behavior.

## Core Workflows

### Authentication

- email/password sign-in through Supabase Auth
- access is allowed only if the authenticated user also exists in `admin_user_roles`
- supported roles:
  - `admin`
  - `operator`
  - `support`
  - `finance`

Auth entry points:
- [app/actions.ts](./app/actions.ts)
- [lib/operatorAuth.ts](./lib/operatorAuth.ts)
- [lib/adminAuth.ts](./lib/adminAuth.ts)

### Location Model

- the operator app always works against one active parking location at a time
- the active location is selected in the header UI
- the selected location is stored in an HTTP-only cookie
- operator API routes resolve and enforce that location context server-side

Location context entry points:
- [components/layout/location-switcher.tsx](./components/layout/location-switcher.tsx)
- [app/api/operator/location/route.ts](./app/api/operator/location/route.ts)
- [lib/operatorLocationServer.ts](./lib/operatorLocationServer.ts)
- [lib/operatorLocation.ts](./lib/operatorLocation.ts)

### Parking Map

The live map is now the main lot operations surface.

It supports:
- applied layout rendering from `parking_lot_layouts`
- live slot status display from `parking_slots`
- slot selection and status updates
- session detail access from active slots

Primary files:
- [app/dashboard/map/page.tsx](./app/dashboard/map/page.tsx)
- [app/api/operator/slots/route.ts](./app/api/operator/slots/route.ts)

### Map Builder

The map builder is the canonical layout editor.

It supports:
- draft layout editing
- save draft
- apply map to backend inventory and layout state
- revision history
- rollback to last applied revision
- impact preview before apply

The builder writes through:
- `parking_slots`
- `parking_lot_layouts`
- `operator_events`

Primary files:
- [app/dashboard/map-builder/page.tsx](./app/dashboard/map-builder/page.tsx)
- [app/api/operator/layout/route.ts](./app/api/operator/layout/route.ts)
- [lib/parkingLotLayout.ts](./lib/parkingLotLayout.ts)
- [lib/operatorLayoutSafety.ts](./lib/operatorLayoutSafety.ts)

### Reservations and Sessions

The operator dashboard now exposes detail drawers for:
- reservation details
- linked session details
- linked payment history
- linked audit history

Primary files:
- [app/dashboard/reservations/page.tsx](./app/dashboard/reservations/page.tsx)
- [components/dashboard/recent-reservations.tsx](./components/dashboard/recent-reservations.tsx)
- [components/dashboard/operation-detail-sheet.tsx](./components/dashboard/operation-detail-sheet.tsx)

### Admin Tools

Admin tooling is location-scoped and preview-driven.

Supported actions:
- reconciliation
- reset slot statuses

All destructive actions:
- require permission checks
- show confirmation with impact summary
- write operator event metadata for traceability

Primary files:
- [app/dashboard/admin-tools/page.tsx](./app/dashboard/admin-tools/page.tsx)
- [app/api/operator/admin-tools/route.ts](./app/api/operator/admin-tools/route.ts)

## Permissions Model

Capabilities are defined in:
- [lib/operatorPermissions.ts](./lib/operatorPermissions.ts)

Current capability split:

- `admin`
  - full operator access
- `operator`
  - operational write access
- `support`
  - read-only operational visibility
- `finance`
  - dashboard, reservations, and audit visibility

The UI hides unavailable routes where appropriate, but API routes are the real enforcement boundary.

## Backend Data Sources

The operator app reads and writes against Supabase through server routes and service-role requests.

Main tables used:
- `locations`
- `parking_slots`
- `parking_lot_layouts`
- `reservations`
- `parking_sessions`
- `payments`
- `operator_events`
- `admin_audit_log`
- `admin_user_roles`

## Realtime and Health

The operator store uses:
- realtime subscriptions when available
- fallback polling when realtime is unavailable
- client-side health tracking for:
  - backend reachability
  - realtime status
  - last successful sync
  - failed action count

Primary files:
- [lib/operatorDataStore.ts](./lib/operatorDataStore.ts)
- [components/dashboard/system-health.tsx](./components/dashboard/system-health.tsx)

## Environment Variables

Required environment variables are documented in [.env.example](./.env.example).

At minimum, the operator app expects:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Notes:
- the service-role key is required because the app’s server routes perform scoped operational writes
- do not expose the service-role key to the browser
- do not commit real environment secrets

## Local Development

From the repo root:

```bash
npm --workspace apps/parking-app-operator run dev
```

Build:

```bash
npm --workspace apps/parking-app-operator run build
```

Tests:

```bash
npm --workspace apps/parking-app-operator run test
```

## Test Coverage

Current automated coverage includes:
- location enforcement
- route contract coverage
- reconciliation planning
- slot label normalization
- slot inventory sync planning
- admin tool scoping
- dashboard metric shaping
- permissions capability checks

Tests live under:
- [tests](./tests)

## Deployment Notes

For production deployment:

1. provision Supabase credentials securely
2. ensure `admin_user_roles` is populated for every operator account
3. confirm at least one active `locations` row exists
4. verify the operator app can read and write:
   - `parking_slots`
   - `parking_lot_layouts`
   - `operator_events`
5. validate realtime connectivity, then confirm fallback polling still works when realtime is unavailable
6. verify role behavior for:
   - `admin`
   - `operator`
   - `support`
   - `finance`

## Operational Notes

### Apply Map

`Apply Map` does more than save layout JSON.

It:
- normalizes slot labels
- syncs slot inventory to backend state
- persists the lot layout
- records a revision event
- refreshes the live parking map

### Save Layout

`Save Layout` is a draft save. It does not become the operational source of truth for slot inventory until `Apply Map` is confirmed.

### Rollback

Rollback republishes a prior applied revision and records a new operator event for traceability.

### Reconciliation

Reconciliation is computed against the active location only. It does not run as a global blind action across all lots.

### Reset Actions

Reset actions are location-scoped and confirmed with preview summaries before execution.

## Known Non-Blocking Issues

- Next.js warns about multiple lockfiles because the repo root uses `package-lock.json` while this app also has `pnpm-lock.yaml`
- test execution currently uses `node --test --experimental-strip-types`, which emits a Node experimental warning

## Next Production Items

If work continues on this app, the next items should be:
- audit export implementation
- richer operator actions from reservation/session detail drawers
- stricter schema-level role boundaries if more staff roles are introduced
- final browser/device pass for runtime ergonomics
