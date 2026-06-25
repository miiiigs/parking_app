# Parking App Operator

Operator dashboard for parking lot operations. This app is the current web frontend for lot monitoring, map management, reconciliation, and operator actions.

## Current Scope

This app is built for:
- authenticated operator access through Supabase Auth
- role-based access for `admin`, `operator`, `support`, and `finance`
- admin-managed operator-to-lot assignments
- admin-managed parking-lot inventory and metadata
- admin-managed dashboard-user onboarding and dashboard-role provisioning through Supabase Auth
- separate global lot administration and selected-lot parking setup surfaces
- explicit active-location context
- live lot monitoring through the applied parking map
- map drafting, applying, rollback, and audit history
- reservation, session, payment, and audit inspection

This app is not a demo shell anymore. The README below describes the actual runtime behavior.

## Core Workflows

### Authentication

- email/password sign-in through Supabase Auth
- access is allowed only if the authenticated user also exists in `admin_user_roles`
- customer mobile accounts and dashboard accounts currently share Supabase Auth, but dashboard access is granted only through `admin_user_roles`
- shared customer/dashboard identity overlap is not production-recommended unless a future access policy explicitly approves it
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
- admins can see all active locations
- non-admin dashboard users only receive locations listed in `operator_location_assignments`
- a selected location is UI context only; durable assignment remains the authorization boundary for privileged lot operations

Location context entry points:
- [components/layout/location-switcher.tsx](./components/layout/location-switcher.tsx)
- [app/api/operator/location/route.ts](./app/api/operator/location/route.ts)
- [lib/operatorLocationServer.ts](./lib/operatorLocationServer.ts)
- [lib/operatorLocation.ts](./lib/operatorLocation.ts)

### Access Control

The `Access Control` page is admin-only.

It supports:
- viewing dashboard accounts from `admin_user_roles`
- inviting new dashboard users through Supabase Auth onboarding
- granting or updating dashboard roles for existing Supabase Auth users
- viewing active parking lots
- creating and removing operator-to-lot assignments in `operator_location_assignments`
- keeping assignment writes on server routes backed by the service-role key

Current limitation:
- this flow now depends on Supabase invitation delivery for new dashboard users; live non-production proof is still required, and the broader production-safe bootstrap-admin decision remains open

Primary files:
- [app/dashboard/access-control/page.tsx](./app/dashboard/access-control/page.tsx)
- [app/api/operator/dashboard-accounts/route.ts](./app/api/operator/dashboard-accounts/route.ts)
- [app/api/operator/location-assignments/route.ts](./app/api/operator/location-assignments/route.ts)
- [lib/operatorLocationAccess.ts](./lib/operatorLocationAccess.ts)

### Parking Setup

The `Parking Setup` page is admin-only and selected-lot scoped.

It supports:
- adjusting pricing, billing intervals, and grace periods for the currently selected dashboard lot
- keeping rate changes separate from global lot inventory management
- making the selected dashboard lot explicit before pricing edits are applied

Primary files:
- [app/dashboard/parking-setup/page.tsx](./app/dashboard/parking-setup/page.tsx)
- [components/dashboard/pricing-settings-panel.tsx](./components/dashboard/pricing-settings-panel.tsx)

### Manage Parking Lots

The `Manage Parking Lots` page is admin-only.

It supports:
- creating parking lots in `locations`
- editing an existing managed lot through a dedicated selected-lot editor
- deactivating or reactivating lots
- refreshing the operator app's active-location inventory after admin lot changes
- keeping global lot administration separate from selected-lot setup

Primary files:
- [app/dashboard/manage-parking-lots/page.tsx](./app/dashboard/manage-parking-lots/page.tsx)
- [components/dashboard/location-management-panel.tsx](./components/dashboard/location-management-panel.tsx)
- [app/api/operator/locations/route.ts](./app/api/operator/locations/route.ts)
- [lib/operatorAdminAccess.ts](./lib/operatorAdminAccess.ts)

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
  - full dashboard access, all-lot visibility, and operator assignment management
- `operator`
  - assigned-lot operational write access
- `support`
  - assigned-lot read-only operational visibility
- `finance`
  - assigned-lot dashboard, reservations, and audit visibility

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
- `operator_location_assignments`

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

From the operator app directory:

```bash
npm install
npm run dev
```

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

Recommended production deployment:

1. set the Vercel project Root Directory to `apps/parking-app-operator`
2. use the default install command: `npm install`
3. use the default build command: `npm run build`
4. do not override the package manager with custom pnpm commands

For production deployment:

1. provision Supabase credentials securely
2. ensure `admin_user_roles` is populated for every operator account
3. use the admin-only Access Control page to invite a new dashboard user or grant a role to an already-existing Supabase Auth user
4. confirm at least one active `locations` row exists
5. provision non-admin lot access through the admin-only Access Control page or through `operator_location_assignments.sql` during staging setup
6. verify the operator app can read and write:
   - `parking_slots`
   - `parking_lot_layouts`
   - `operator_events`
7. validate the dedicated `Manage Parking Lots` flow against the shared backend `locations` inventory and confirm `Parking Setup` stays selected-lot scoped
8. confirm mobile clients see the same active lots after admin lot changes
9. validate realtime connectivity, then confirm fallback polling still works when realtime is unavailable
10. verify role behavior for:
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

- test execution currently uses `node --test --experimental-strip-types`, which emits a Node experimental warning

## Next Production Items

If work continues on this app, the next items should be:
- audit export implementation
- richer operator actions from reservation/session detail drawers
- staged verification of admin-managed dashboard-role, lot-management, and operator-assignment flows
- staged verification of invitation-based dashboard onboarding and admin-managed lot flows
- final browser/device pass for runtime ergonomics
