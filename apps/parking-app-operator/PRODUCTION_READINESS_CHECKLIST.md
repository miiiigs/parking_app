# Parking App Operator Production Readiness Checklist

Last reassessed: 2026-06-08

## Completed In This Pass

- [x] Remove the TypeScript build bypass from [next.config.mjs](./next.config.mjs).
- [x] Fix current operator type errors so `npx tsc -p tsconfig.json --noEmit` passes.
- [x] Confirm `next build` succeeds with real TypeScript checking enabled.
- [x] Remove demo reset behavior from the production operator surface.
- [x] Remove demo reset capability wiring from the permissions model.
- [x] Remove the demo reset card and messaging from the admin tools UI.
- [x] Update operator tests to reflect the production-only admin tool set.
- [x] Replace fixed `limit=200` dashboard reads with paged server-side fetch helpers.
- [x] Batch `in.(...)` dashboard lookups to reduce URL-size risk for large slot, reservation, and session sets.

## Still Open

### Backend Integration

- [x] Add Zod validation for mutating operator routes:
  - [app/api/operator/layout/route.ts](./app/api/operator/layout/route.ts)
  - [app/api/operator/slots/route.ts](./app/api/operator/slots/route.ts)
  - [app/api/operator/admin-tools/route.ts](./app/api/operator/admin-tools/route.ts)
- [x] Add the service-role-backed gate-entry confirmation API with durable operator/location assignment checks.
- [ ] Add an operator-facing Parking Actions page that calls the gate-entry API for entry scan/manual confirmation.
- [ ] Keep exit scan/confirmation actions blocked until the backend paid-exit authorization contract exists.
- [ ] Break the dashboard contract into dedicated paginated endpoints for reservations, payments, audit logs, and reconciliation history instead of one large aggregate payload.
- [ ] Add structured error logging and request correlation IDs for operator API routes.
- [ ] Add idempotency protection for high-risk writes such as map apply, rollback, slot resets, and status changes.
- [ ] Reassess fallback polling cadence in [lib/operatorDataStore.ts](./lib/operatorDataStore.ts) now that hard truncation is removed.

### UI and UX

- [x] Remove `userScalable: false` from [app/layout.tsx](./app/layout.tsx).
- [x] Remove placeholder metadata like `generator: 'v0.app'` from [app/layout.tsx](./app/layout.tsx).
- [x] Implement the audit export button in [app/dashboard/audit/page.tsx](./app/dashboard/audit/page.tsx).
- [x] Add the missing `no-show` reservation filter in [app/dashboard/reservations/page.tsx](./app/dashboard/reservations/page.tsx).
- [x] Add server-backed pagination and mobile-friendly list layouts for reservations and audit views.

### Repo and Runtime Hygiene

- [x] Rename the operator workspace from `my-project` in [package.json](./package.json).
- [x] Resolve the Node test warnings by setting a consistent module strategy for the operator workspace.
- [x] Resolve the Turbopack workspace-root warning caused by multiple lockfiles.
- [ ] Triage and remediate the reported dependency vulnerabilities from the root install.

## Validation Snapshot

- [x] `npx tsc -p apps/parking-app-operator/tsconfig.json --noEmit`
- [x] `npm --workspace apps/parking-app-operator run test`
- [x] `npm --workspace apps/parking-app-operator run build`

## Suggested Next Features

- [ ] Parking Actions page for entry scan, manual gate confirmation, and future exit scan handling.
- [ ] Shift handoff log with unresolved issues and operator notes.
- [ ] Real audit export with CSV or PDF download history.
- [ ] Alerting for slot or session mismatches and realtime degradation.
- [ ] Approval workflow for destructive actions and map apply or rollback.
- [ ] Per-location SLA and occupancy trend reporting.
- [ ] Operator activity timeline with actor, reason, and location context.
