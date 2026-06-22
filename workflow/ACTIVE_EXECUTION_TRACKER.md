# Active Execution Tracker

This is the operating tracker derived from `MASTER_PRODUCTION_PLAN.md`.

Use this document to decide what we do next, what is blocked, and what can be declared done.

## Program Rules

- Do not start a lower-priority launch blocker while a higher-priority dependency is unresolved unless parallel work is explicitly safe.
- Do not mark work done based on code alone when the success gate requires device validation, production data validation, or operator validation.
- Every task must have:
  - an owner
  - a dependency status
  - a success gate
  - a rollback or fallback note
  - a future polish note when applicable

## Launch Priority Bands

### P0 - Must Be Solved Before Pilot Production

- Environment and migration control
- Backend-complete reservation lifecycle
- Backend-complete walk-in lifecycle
- Real QR validation flow
- Real payment integration and settlement
- Expiry, no-show, and housekeeping automation
- Observability and analytics baseline
- Real-device release validation
- Operator operational readiness

### P1 - Strongly Recommended Before Broader Rollout

- Dedicated paginated operator endpoints
- Security hardening and abuse controls
- Shift handoff and richer operator actions
- Customer history and receipt archive
- Alerting and incident workflows

### P2 - Post-Pilot Growth and Optimization

- Dynamic pricing
- Advanced analytics and forecasting
- Corporate and fleet support
- Multi-location scaling improvements
- Automation integrations

## Ownership Model

Suggested owner labels:

- `Founder/Product`
- `Mobile`
- `Backend`
- `Operator`
- `DevOps`
- `Data/Analytics`
- `Security`
- `QA/Release`

These are role labels, not necessarily final team assignments.

## Current Program Board

## Track A - Environment, Deployment, and Migration Control

Priority:
- `P0`

Status:
- `In progress - baseline rebuilt from repo reality; staging bootstrap and rollback rehearsal still pending`

Owner:
- `Backend` + `DevOps`

Why this is next:
- Every other production step depends on clear environment separation, migration discipline, rollback safety, and release ownership. The rebuilt baseline now exists again, but it still needs a real `staging` bootstrap and rollback rehearsal before later launch-critical work can rely on it fully.

Tasks:
- [x] Rebuild the current environment matrix for `local`, `staging`, `pilot-production`, and `production`.
- [x] Rebuild the current env var inventory for mobile, operator, and Supabase from actual repo usage.
- [x] Rebuild migration, bootstrap, rollback, and compatibility sequencing from the committed SQL and app artifacts.
- [x] Rebuild backup, restore, and seed-data policy guidance from current project reality.
- [ ] Rehearse one fresh `staging` bootstrap and one rollback drill after the rebuilt baseline exists.

Success gate:
- One current documented environment and release-operations baseline exists, and a fresh setup plus rollback path can be executed without tribal knowledge.

Dependencies:
- none

Rollback/fallback:
- freeze non-trivial schema changes until the rebuilt baseline is validated in `staging`

Future polish:
- automated migration validation in CI

Implementation:
- Current evidence:
- [TRACK_A_ENVIRONMENT_RELEASE_BASELINE.md](./TRACK_A_ENVIRONMENT_RELEASE_BASELINE.md)
- [apps/mobile/.env.example](../apps/mobile/.env.example)
- [apps/parking-app-operator/.env.example](../apps/parking-app-operator/.env.example)
- [supabase/README.md](../supabase/README.md)

Validation method:
- Re-audited current mobile and operator env var usage against committed code and env templates.
- Re-audited current mobile build scripts, EAS profiles, Android release guidance, and operator deployment guidance.
- Re-audited the committed Supabase SQL artifact set and rebuilt the current bootstrap, compatibility, backup, restore, and reset posture from those files.

Remaining gap before declaring the gate fully closed:
- A fresh `staging` bootstrap and one rollback drill still need to be rehearsed against a non-production Supabase project using the rebuilt baseline.
- Real environment secrets, operator deployment credentials, and Android release signing assets still require manual provisioning outside the repo.

## Track B - Reservation Lifecycle Hardening

Priority:
- `P0`

Status:
- `In progress`

Owner:
- `Mobile` + `Backend`

Already true:
- reservation, arrival, session, exit, and receipt flow already exist

Tasks:
- [ ] Remove remaining production-risk fallback assumptions from customer-critical paths.
- [ ] Confirm slot-state race handling under concurrent reservations.
- [ ] Add clearer server-driven expired and no-show handling.
- [ ] Add stronger failure UX for stale slot, lost session, and retry paths.
- [ ] Add release-quality customer-facing copy for all critical states.

Success gate:
- A signed-in user can complete the reservation-backed lifecycle on live backend data with no manual record fixing.

Dependencies:
- Track A

Rollback/fallback:
- if live sync fails, hide booking actions instead of showing misleading inventory

Future polish:
- richer occupied-slot dispute handling

## Track C - Walk-In Backend Completion

Priority:
- `P0`

Status:
- `In progress`

Owner:
- `Backend` + `Mobile` + `Operator`

Why this is critical:
- Current walk-in flow is useful, but not strong enough yet for commercial trust and auditability.

Tasks:
- [x] Decide final walk-in model: reservation-like server flow or operator-issued direct session flow.
- [x] Persist walk-in entry issuance and session start in backend.
- [ ] Ensure walk-in inventory does not steal or corrupt reserved inventory.
- [ ] Surface walk-in state and audit trail in operator dashboard.
- [ ] Add timeout and invalidation rules for walk-in QR issuance.

Success gate:
- Walk-in sessions are visible, auditable, billable, and recoverable from backend state alone.

Dependencies:
- Track A

Rollback/fallback:
- if backend-complete walk-in is not ready, do not expose walk-in for pilot launch

Future polish:
- operator-assisted express walk-in

Implementation:
- [supabase/walk_in_support.sql](../supabase/walk_in_support.sql)
- [supabase/issue_walk_in_entry_pass.sql](../supabase/issue_walk_in_entry_pass.sql)
- [supabase/start_walk_in_session.sql](../supabase/start_walk_in_session.sql)
- [apps/mobile/src/lib/reservations.ts](../apps/mobile/src/lib/reservations.ts)
- [apps/mobile/src/features/parking/store/useParkingFlowStore.ts](../apps/mobile/src/features/parking/store/useParkingFlowStore.ts)
- [apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx](../apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx)
- [apps/mobile/tests/walkInContract.test.mjs](../apps/mobile/tests/walkInContract.test.mjs)

Validation method:
- `npm --workspace apps/mobile run test`
- `npm --workspace apps/mobile run typecheck`
- Verified the mobile walk-in flow now issues backend entry passes first, then starts backend sessions when a walk-in reservation exists.
- Verified the new SQL layer enforces backend-derived identity, explicit walk-in source tagging, and server-owned slot hold creation.

Remaining gap before success gate:
- Walk-in expiry automation still needs a backend cleanup path that releases stale held inventory without relying on the mobile app reopening.
- Operator dashboard visibility and audit-focused walk-in views are still not implemented.
- A non-production Supabase rollout rehearsal is still recommended before this is treated as launch-safe.

## Track D - Real QR Validation

Priority:
- `P0`

Status:
- `Ready`

Owner:
- `Mobile` + `Backend`

Tasks:
- [ ] Add camera-based QR scanner for arrival validation.
- [ ] Validate slot QR contents against assigned slot and reservation/session state.
- [ ] Add wrong-slot recovery UX.
- [ ] Add operator-friendly fallback when scanning fails on weak signal or damaged codes.
- [ ] Decide whether entry and slot QR are separate concepts or one unified scheme.

Success gate:
- Real-device QR scanning is the default validation path and rejects invalid or mismatched slot scans.

Dependencies:
- Track B

Rollback/fallback:
- guarded manual validation path for pilot only

Future polish:
- gate QR and kiosk QR variants

## Track E - Payments and Settlement

Priority:
- `P0`

Status:
- `Ready`

Owner:
- `Backend` + `Mobile` + `Data/Analytics`

Tasks:
- [ ] Select payment provider and integration model.
- [ ] Implement server-side payment intent / charge lifecycle.
- [ ] Add webhook processing and idempotent settlement logic.
- [ ] Add failed payment, retry, refund, and reversal handling.
- [ ] Add finance-visible reports and discrepancy views.

Success gate:
- Payment can be charged, confirmed, reconciled, and audited without manual spreadsheet correction.

Dependencies:
- Track A

Rollback/fallback:
- manual payment can be used only for controlled pilot if clearly marked and operationally staffed

Future polish:
- subscriptions and stored-value flows

## Track F - Automation and Housekeeping

Priority:
- `P0`

Status:
- `Ready`

Owner:
- `Backend`

Tasks:
- [ ] Add reservation expiry automation.
- [ ] Add no-show marking rules.
- [ ] Add session timeout or stale-session safeguards if needed.
- [ ] Add recurring reconciliation and drift detection jobs.
- [ ] Define operational thresholds for automatic vs manual correction.

Success gate:
- Expired and abandoned flows are cleaned up reliably without depending on the customer reopening the app.

Dependencies:
- Track B
- Track C

Rollback/fallback:
- operator reconciliation script for pilot while automation matures

Future polish:
- predictive drift detection

## Track G - Observability and Commercial Analytics

Priority:
- `P0`

Status:
- `Ready`

Owner:
- `Backend` + `Data/Analytics` + `Mobile` + `Operator`

Tasks:
- [ ] Add structured request logging with correlation IDs.
- [ ] Add mobile crash and release health reporting.
- [ ] Add backend latency and route error metrics.
- [ ] Add business event instrumentation across the customer funnel.
- [ ] Add operator health metrics and realtime degradation alerts.
- [ ] Build launch dashboards for exec, product, operations, and finance.

Success gate:
- We can explain conversion loss, operational drift, and revenue issues from instrumentation, not guesswork.

Dependencies:
- Track A

Rollback/fallback:
- if full dashboards are not ready, at minimum ship logs, alerts, and raw event capture

Future polish:
- forecasting and pricing optimization models

## Track H - Operator Production Operations

Priority:
- `P0`

Status:
- `In progress`

Owner:
- `Operator` + `Backend`

Already true:
- location-scoped dashboard, map, pricing, reconciliation, and audit base exist

Tasks:
- [ ] Split large dashboard data contract into dedicated paginated endpoints.
- [ ] Add richer detail actions for disputes and manual intervention.
- [ ] Add shift handoff notes and unresolved issue log.
- [ ] Add approval workflow for destructive actions.
- [ ] Add operational alerts for slot mismatch and realtime degradation.

Success gate:
- Operators can run a full day of parking operations without engineering opening Supabase directly.

Dependencies:
- Track A
- Track G

Rollback/fallback:
- restricted pilot with engineer-on-call for first production days

Future polish:
- multi-location operator console

## Track I - Security and Abuse Controls

Priority:
- `P1`

Status:
- `Ready`

Owner:
- `Security` + `Backend`

Tasks:
- [ ] Threat model reservation abuse and operator misuse.
- [ ] Add rate limits and anomaly checks.
- [ ] Review `security definer` functions.
- [ ] Tighten authorization boundaries around service-role-assisted routes.
- [ ] Review PII handling and retention.

Success gate:
- Core abuse and privilege escalation paths are reviewed and mitigated before expansion.

Dependencies:
- Track A

Rollback/fallback:
- keep pilot location small and access tightly controlled while controls harden

Future polish:
- fraud scoring

## Track J - QA, Device Validation, and Release

Priority:
- `P0`

Status:
- `In progress`

Owner:
- `QA/Release` + `Mobile` + `Operator`

Already true:
- mobile tests passing
- operator tests passing
- mobile typecheck passing

Tasks:
- [ ] Add operator typecheck to standard validation flow.
- [ ] Add route-level and device-level tests where missing.
- [ ] Validate native notifications in real Android builds.
- [ ] Validate reservation, arrival, session, payment, exit, and receipt on a real device.
- [ ] Add release signoff checklist by owner.

Success gate:
- A release candidate passes automated checks and a human-run production script on real devices.

Dependencies:
- Tracks B through H

Rollback/fallback:
- hold rollout to internal testing only

Future polish:
- device-farm automation

## Do Next Queue

These are the next tasks we should actively execute in order.

1. `Track A`: rehearse one fresh `staging` bootstrap and one rollback drill against a non-production Supabase project using the rebuilt baseline
2. `Track C`: add walk-in expiry automation and operator visibility, then validate the rollout against `staging`
3. `Track D`: real QR scanner and validation contract
4. `Track E`: payment provider decision and backend settlement design
5. `Track G`: establish the first observability and analytics baseline around the launch-critical flows

## Recommended Parallel Work Split

If multiple builders are available, this is the safest split:

- Builder 1: Track A staging bootstrap and rollback rehearsal against the rebuilt baseline
- Builder 2: Track C walk-in expiry automation and operator visibility path
- Builder 3: Track D mobile QR scanner integration spike
- Builder 4: Track G analytics event taxonomy and logging plan

## Definition Of Done For This Stage

This execution tracker becomes useful only if we keep it current.

For every completed task:
- update status
- link the implementation file or PR
- record the validation method
- note what remains as polish rather than silently stretching the scope
