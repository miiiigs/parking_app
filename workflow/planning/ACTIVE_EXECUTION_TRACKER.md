# Active Execution Tracker

This is the operating tracker derived from `MASTER_PRODUCTION_PLAN.md`.

Use this document to decide what we do next, what is blocked, and what can be declared done.

## Program Rules

- Do not start a lower-priority launch blocker while a higher-priority dependency is unresolved unless parallel work is explicitly safe.
- Do not mark work done based on code alone when the success gate requires device validation, production data validation, or operator validation.
- The master production plan is the controlling product contract when workflow docs disagree.
- The intended customer flow is gate-entry-first: reservation entry QR is validated by the gate or operator, the backend becomes authoritative for session activation after entry confirmation, parking grace applies before metered time, and slot-QR validation is not the target production interaction.
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
- Gate-entry and exit QR lifecycle
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
- Every later production step depends on clear environment separation, migration discipline, rollback safety, and release ownership. The repo already has a rebuilt baseline, but it still needs a real `staging` bootstrap and rollback rehearsal before later launch-critical work can rely on it fully.

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
- [TRACK_A_ENVIRONMENT_RELEASE_BASELINE.md](./TRACK_A_ENVIRONMENT_RELEASE_BASELINE.md)
- [apps/mobile/.env.example](../apps/mobile/.env.example)
- [apps/parking-app-operator/.env.example](../apps/parking-app-operator/.env.example)
- [supabase/README.md](../supabase/README.md)

Validation method:
- Re-audited current mobile and operator env var usage against committed code and env templates.
- Re-audited current mobile build scripts, EAS profiles, Android release guidance, and operator deployment guidance.
- Re-audited the committed Supabase SQL artifact set and rebuilt the current bootstrap, compatibility, backup, restore, and reset posture from those files.

Remaining gap before success gate:
- A fresh `staging` bootstrap and one rollback drill still need to be rehearsed against a non-production Supabase project using the rebuilt baseline.
- Real environment secrets, operator deployment credentials, and Android release signing assets still require manual provisioning outside the repo.

## Track B - Reservation Lifecycle Hardening

Priority:
- `P0`

Status:
- `In progress - repo rework accepted for durable operator-location assignment and terminal replay rejection; staging proof remains open`

Owner:
- `Mobile` + `Backend`

Already true:
- reservation, arrival, session, exit, and receipt flow already exist
- the mobile reservation screen now presents an entry-pass-style QR instead of routing users into slot-validation scanning

Tasks:
- [ ] Remove remaining production-risk fallback assumptions from customer-critical paths.
- [x] Define the backend-owned gate or operator confirmation contract that transitions a reservation from arrival to active session.
- [ ] Confirm slot-state race handling under concurrent reservations.
- [ ] Add clearer server-driven expired and no-show handling.
- [x] Add backend-owned parking-grace and metered-start behavior after confirmed lot entry.
- [ ] Add stronger failure UX for stale slot, lost session, and retry paths.
- [ ] Add release-quality customer-facing copy for all critical states.

Success gate:
- A signed-in user can complete the reservation-backed lifecycle on live backend data from reservation through gate entry, parking grace, payment, and exit without manual record fixing.

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
- `In progress - backend-native walk-in issuance and cleanup artifacts exist, but staging rollout proof and final inventory safety evidence remain open`

Owner:
- `Backend` + `Mobile` + `Operator`

Why this is critical:
- Current walk-in flow is useful, but it is not strong enough yet for commercial trust and auditability.

Tasks:
- [x] Decide final walk-in model: reservation-like server flow or operator-issued direct session flow.
- [x] Persist walk-in entry issuance and session start in backend.
- [ ] Ensure walk-in inventory does not steal or corrupt reserved inventory.
- [x] Surface walk-in state and audit trail in operator dashboard.
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
- [supabase/expire_stale_walk_in_entry_passes.sql](../supabase/expire_stale_walk_in_entry_passes.sql)
- [supabase/schedule_walk_in_expiry_cleanup.sql](../supabase/schedule_walk_in_expiry_cleanup.sql)
- [apps/mobile/src/lib/reservations.ts](../apps/mobile/src/lib/reservations.ts)
- [apps/mobile/src/features/parking/store/useParkingFlowStore.ts](../apps/mobile/src/features/parking/store/useParkingFlowStore.ts)
- [apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx](../apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx)
- [apps/mobile/tests/walkInContract.test.mjs](../apps/mobile/tests/walkInContract.test.mjs)
- [apps/parking-app-operator/app/dashboard/reservations/page.tsx](../apps/parking-app-operator/app/dashboard/reservations/page.tsx)
- [apps/parking-app-operator/app/api/operator/reservations/route.ts](../apps/parking-app-operator/app/api/operator/reservations/route.ts)

Validation method:
- `npm --workspace apps/mobile run test`
- `npm --workspace apps/mobile run typecheck`
- Verified the mobile walk-in flow now issues backend entry passes first, then starts backend sessions when a walk-in reservation exists.
- Verified the new SQL layer enforces backend-derived identity, explicit walk-in source tagging, and server-owned slot hold creation.
- `npm --workspace apps/parking-app-operator run test`
- `npm --workspace apps/parking-app-operator run build`
- Verified repo-level contracts for locked stale-hold cleanup, active-session and newer-hold protection, service-role-only execution, audit-event creation, source filtering, and operator list/detail visibility.

Remaining gap before success gate:
- The cleanup function and opt-in scheduler artifact exist, but `pg_cron` activation and observed execution still require a non-production Supabase rollout.
- Inventory safety is covered by repo-level guards and contract tests, but still needs database-level concurrency rehearsal before that task can be marked complete.
- Operator source visibility and linked audit history are implemented; real operator acceptance against staging remains open.

## Track D - Gate Entry, Grace Periods, and Exit QR Lifecycle

Priority:
- `P0`

Status:
- `In progress - backend confirmation is accepted in repo; operator Parking Actions client, assignment provisioning, scanner integration, exit authorization, and staging proof remain open`

Owner:
- `Mobile` + `Backend`

Tasks:
- [x] Present a reservation-backed entry QR ticket in the mobile flow.
- [x] Remove slot-QR validation as the default mobile activation path.
- [~] Redirect gate or operator validation into the matching reservation and confirm lot entry in backend state. The authenticated location-scoped API exists; a production gate scanner or operator Parking Actions client still needs to call it.
- [x] Start the parking lifecycle on confirmed lot entry without requiring a second slot-validation scan.
- [x] Add a parking grace countdown before the metered timer starts.
- [ ] Add a paid exit QR and leave-the-slot grace countdown after payment.
- [ ] Define and implement penalty handling for expired exit grace or wrong-slot behavior.
- [ ] Define automatic conflict-resolution and compensation behavior with operator visibility.

Success gate:
- A reservation can be fulfilled through gate QR entry, backend-confirmed session activation, parking grace, payment, exit grace, and penalty-safe expiry handling without requiring slot-validation scanning.

Dependencies:
- Track B

Rollback/fallback:
- guarded operator-assisted entry and exit handling for pilot only

Future polish:
- kiosk, ANPR, and hardware-gate variants

Implementation:
- [apps/mobile/app/validate.tsx](../apps/mobile/app/validate.tsx)
- [apps/mobile/src/features/parking/screens/ArrivalScreen.tsx](../apps/mobile/src/features/parking/screens/ArrivalScreen.tsx)
- [apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx](../apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx)
- [apps/mobile/src/features/parking/store/useParkingFlowStore.ts](../apps/mobile/src/features/parking/store/useParkingFlowStore.ts)
- [apps/mobile/tests/reservationContract.test.mjs](../apps/mobile/tests/reservationContract.test.mjs)
- [apps/mobile/tests/walkInContract.test.mjs](../apps/mobile/tests/walkInContract.test.mjs)

Validation method:
- `npm.cmd --workspace apps/mobile run test`
- `npm.cmd --workspace apps/mobile run typecheck`
- Verified the reservation arrival flow now presents an entry-pass QR and no longer routes users through slot-QR validation.
- Verified the walk-in entry-pass flow no longer routes through `/validate` and now continues into the session flow after gate or operator confirmation from the app UX perspective.
- Verified the repo now contains backend-owned gate confirmation and parking-grace boundaries; exit authorization, automated penalties, compensation handling, scanner-client integration, and staging proof remain open.

Remaining gap before success gate:
- The backend-owned gate or operator confirmation event exists as a location-scoped API and SQL contract, but no production gate scanner or operator Parking Actions client has been connected yet.
- Backend state transitions for paid exit grace, penalty assessment, and compensation are not yet defined as the authoritative contract in repo code.
- Operator and support handling for conflicts, compensation, and exit overstay remain open product and implementation gaps.

## Track E - Payments and Settlement

Priority:
- `P0`

Status:
- `Ready`

Owner:
- `Backend` + `Mobile` + `Data/Analytics`

Tasks:
- [ ] Select payment provider and integration model.
- [ ] Implement server-side payment intent or charge lifecycle.
- [ ] Add webhook processing and idempotent settlement logic.
- [ ] Add failed payment, retry, refund, and reversal handling.
- [ ] Add finance-visible handling for penalties, compensation credits, and fee waivers.
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
- [ ] Add parking-grace and exit-grace expiry automation.
- [ ] Add session timeout or stale-session safeguards if needed.
- [ ] Add penalty and compensation automation triggers where policy requires them.
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
- `In progress - base operator surfaces exist, but gate-entry exceptions, compensation handling, and overstay actions are still missing`

Owner:
- `Operator` + `Backend`

Already true:
- location-scoped dashboard, map, pricing, reconciliation, and audit base exist

Tasks:
- [ ] Add a `Parking Actions` operator menu for entry scan, exit scan planning, and manual QR confirmation workflows.
- [ ] Connect entry QR scan/manual confirmation to the reviewed `/api/operator/gate-entry` route.
- [ ] Keep exit scan actions blocked or informational until the backend paid-exit authorization contract exists.
- [ ] Split large dashboard data contract into dedicated paginated endpoints.
- [ ] Add richer detail actions for disputes, compensation, and manual intervention.
- [ ] Add shift handoff notes and unresolved issue log.
- [ ] Add approval workflow for destructive actions.
- [ ] Add operational alerts for slot mismatch, exit overstay, and realtime degradation.

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
- [ ] Validate reservation, gate entry, session, payment, exit, and receipt on a real device.
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

1. `Track H` plus `Track D` repo work: add the operator `Parking Actions` entry scan/manual confirmation surface that calls the reviewed gate-entry API; keep exit scan visibly planned but blocked on the exit authorization backend contract.
2. `Track A` manual follow-up: rehearse one fresh `staging` bootstrap and one rollback drill against a non-production Supabase project using the rebuilt baseline.
3. `Track D` manual/staging follow-up: provision operator-location assignments and prove valid, duplicate, expired, cancelled, completed, wrong-location, unauthorized-location, and concurrent scans in staging.
4. `Track C` manual follow-up: deploy the cleanup function, enable the scheduler, and observe expiry, slot release, and audit events in staging.
5. `Track E`: payment provider decision and backend settlement design.
6. `Track G`: establish the first observability and analytics baseline around the launch-critical flows.

## Recommended Parallel Work Split

If multiple builders are available, this is the safest split:

- Builder 1: Track A staging bootstrap and rollback rehearsal against the rebuilt baseline when credentials and a target are available.
- Builder 2: Track H plus Track D operator Parking Actions entry scan/manual confirmation implementation slice.
- Builder 3: Track C cleanup deployment, scheduler activation, and operator acceptance in staging.
- Builder 4: Track G analytics event taxonomy and logging plan.

## Definition Of Done For This Stage

This execution tracker becomes useful only if we keep it current.

For every completed task:
- update status
- link the implementation file or PR
- record the validation method
- note what remains as polish rather than silently stretching the scope
