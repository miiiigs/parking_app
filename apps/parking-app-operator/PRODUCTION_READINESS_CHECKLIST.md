# Parking App Operator Production Readiness Checklist

Last reassessed: 2026-06-25

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
- [x] Finalize operator-versus-admin navigation visibility, non-admin no-switcher behavior, and the `Operator Tools` label while keeping admin-only control-plane surfaces hidden.
- [x] Add an admin-only customer oversight surface with customer activity summaries and dashboard-account overlap visibility.

## Still Open

### Backend Integration

- [x] Add Zod validation for mutating operator routes:
  - [app/api/operator/layout/route.ts](./app/api/operator/layout/route.ts)
  - [app/api/operator/slots/route.ts](./app/api/operator/slots/route.ts)
  - [app/api/operator/admin-tools/route.ts](./app/api/operator/admin-tools/route.ts)
- [x] Add the service-role-backed gate-entry confirmation API with durable operator/location assignment checks.
- [x] Add an operator-facing Parking Actions page that calls the gate-entry API for entry scan/manual confirmation.
- [x] Add an admin-only Access Control page and server route for operator-to-lot assignment management.
- [x] Add admin-side parking-lot management backed by `locations` with operator-side active-location refresh after lot changes.
- [x] Add dashboard-role provisioning for existing Supabase Auth users through the admin-only Access Control page.
- [x] Add invitation-based dashboard auth-user onboarding from the admin-only Access Control page so provisioning no longer depends on a pre-created Supabase Auth account.
- [x] Scope non-admin dashboard location context to explicit `operator_location_assignments` rows.
- [ ] Keep exit scan/confirmation actions blocked until the backend paid-exit authorization contract exists.
- [ ] Prove admin-managed assignment creation/removal against a non-production Supabase project.
- [ ] Prove admin-managed lot create, update, deactivate, and reactivation flows against a non-production Supabase project.
- [ ] Prove dashboard-role provisioning and invitation-based onboarding against real Supabase Auth users in a non-production project.
- [ ] Prove the admin-only customer oversight page against non-production reservation and Supabase Auth data.
- [ ] Validate at least three active seeded lots across operator and mobile surfaces in staging.
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

- [ ] Complete the backend paid-exit authorization contract so the now-visible exit scan and manual verification surface can become real.
- [ ] Full non-production proof for invitation delivery, first sign-in completion, and bootstrap-admin replacement.
- [ ] Deeper customer-support workflows beyond the new read-only customer oversight page.
- [ ] Shift handoff log with unresolved issues and operator notes.
- [ ] Real audit export with CSV or PDF download history.
- [ ] Alerting for slot or session mismatches and realtime degradation.
- [ ] Approval workflow for destructive actions and map apply or rollback.
- [ ] Per-location SLA and occupancy trend reporting.
- [ ] Operator activity timeline with actor, reason, and location context.
