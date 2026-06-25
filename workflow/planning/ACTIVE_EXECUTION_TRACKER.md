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
- `In progress - backend confirmation and the first operator Parking Actions entry client now exist in repo; assignment provisioning, hardware-scanner proof, exit authorization, and staging proof remain open`

Owner:
- `Mobile` + `Backend`

Tasks:
- [x] Present a reservation-backed entry QR ticket in the mobile flow.
- [x] Remove slot-QR validation as the default mobile activation path.
- [~] Redirect gate or operator validation into the matching reservation and confirm lot entry in backend state. The authenticated location-scoped API exists and the first operator Parking Actions client now calls it; staging proof and hardware-scanner validation still remain.
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
- The backend-owned gate or operator confirmation event exists as a location-scoped API and SQL contract, and the operator dashboard now has a first Parking Actions entry client plus manual reservation/session fallback actions. Non-production Supabase proof, assignment provisioning, and real scanner validation still remain.
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
- `In progress - the first Parking Actions surface now exists for entry scan/manual verification, but exit authorization, dispute handling, compensation handling, and broader operator interventions are still missing`

Owner:
- `Operator` + `Backend`

Already true:
- location-scoped dashboard, map, pricing, reconciliation, and audit base exist

Tasks:
- [x] Add a `Parking Actions` operator menu for entry scan, exit scan planning, and manual QR confirmation workflows.
- [x] Connect entry QR scan/manual confirmation to the reviewed `/api/operator/gate-entry` route.
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

Implementation:
- [apps/parking-app-operator/app/dashboard/parking-actions/page.tsx](../apps/parking-app-operator/app/dashboard/parking-actions/page.tsx)
- [apps/parking-app-operator/components/dashboard/parking-action-controls.tsx](../apps/parking-app-operator/components/dashboard/parking-action-controls.tsx)
- [apps/parking-app-operator/components/dashboard/operation-detail-sheet.tsx](../apps/parking-app-operator/components/dashboard/operation-detail-sheet.tsx)
- [apps/parking-app-operator/components/layout/dashboard-layout.tsx](../apps/parking-app-operator/components/layout/dashboard-layout.tsx)
- [apps/parking-app-operator/PRODUCTION_READINESS_CHECKLIST.md](../apps/parking-app-operator/PRODUCTION_READINESS_CHECKLIST.md)

Validation method:
- `npm --workspace apps/parking-app-operator run test`
- `npm --workspace apps/parking-app-operator run build`
- `git diff --check`
- Verified the operator dashboard now exposes a discoverable `Parking Actions` route, manual reservation/session fallback controls, and an explicit exit-blocked state without claiming a backend exit mutation exists.

Remaining gap before success gate:
- Browser-level entry scanning now exists with manual QR fallback, but real scanner hardware behavior still needs non-production operator validation.
- Exit verification is intentionally visible-but-blocked until the backend paid-exit authorization and grace contract exists.
- Operators still lack richer dispute, compensation, and overstay interventions for real-world exception handling.

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

## Track K - Admin Control Plane, Identity Separation, and Multi-Lot Provisioning

Priority:
- `P0`

Status:
- `In progress - repo now includes admin/operator identity separation, assignment management, dashboard-role onboarding through existing or invited auth users, dedicated global lot administration, selected-lot parking setup separation, final operator/admin navigation plus location-control separation, and an initial admin-only customer oversight surface; manual staging proof, bootstrap-admin hardening, and broader support or analytics follow-up remain open`

Owner:
- `Backend` + `Operator` + `Mobile` + `Security`

Already true:
- `parking-app-operator` already has role-aware capability checks, location context, and an `admin` role concept
- the gate-entry route already enforces exact operator-location assignment for privileged mutation
- the mobile app, operator app, and Supabase backend already share one parking domain model

Tasks:
- [x] Define the shared `admin and operator` app model for `parking-app-operator`, including which screens stay shared and which become admin-only.
- [ ] Keep `admin@example.com` as the current non-production bootstrap admin and document the production-safe replacement or bootstrap path.
- [x] Distinguish customer mobile identities from operator/admin dashboard identities and define whether any shared-account overlap is allowed.
- [~] Give admin full-system visibility and control across all parking lots, operator accounts, operator-to-lot assignments, and customer oversight surfaces that belong in the dashboard. Assignment management, lot management, dashboard-role provisioning, and an initial read-only customer oversight surface now exist; broader support workflows and analytics remain future work.
- [x] Add an admin-only customer oversight surface that summarizes customer contact, recent reservation or session activity, payment state, location history, and any dashboard-access overlap without broadening non-admin visibility.
- [~] Add admin-managed operator assignment and provisioning flows so lot assignment does not require direct SQL for normal operations. Assignment management plus dashboard-role onboarding for existing or newly invited Supabase Auth users now exist; live staging proof and broader bootstrap hardening are still open.
- [x] Ensure operators can only view or mutate the parking lots they are explicitly assigned to.
- [x] Add at least two more parking lots in backend-backed development or staging-ready data and make operator plus mobile surfaces reflect the same location inventory.
- [~] Align backend contracts, seeded location data, mobile location queries, and operator location queries so multi-lot behavior matches end to end. Repo contracts and seed data are aligned; staging proof remains open.
- [x] Add admin-side parking-lot management so new lots can be created, updated, and managed from the dashboard with clean backend persistence.
- [x] Add admin-side operator account creation or invitation management so admin can provision dashboard operators before assigning them to parking lots.
- [~] Ensure admin-managed parking-lot changes propagate cleanly to the mobile app's available parking-lot list and other location-backed surfaces. Repo-backed `locations` reads stay shared across mobile and operator surfaces, and the operator auth context now refreshes location inventory after admin lot changes; non-production proof is still required.
- [x] Move global parking-lot creation and multi-lot administration into a new admin-only `Manage Parking Lots` menu instead of keeping those controls under lot-scoped `Parking Setup`.
- [x] Keep `Parking Setup` focused on the currently selected parking lot only.
- [x] Replace create-form reuse for lot editing with a selected-lot dropdown card or dedicated selected-lot editor so editing an existing lot is cleaner and more explicit.
- [x] Finalize operator-versus-admin menu visibility so operators only see operational pages and admin-only control surfaces remain hidden from non-admin roles.
- [x] Rename the operator-facing `Admin Tools` menu or page label to `Operator Tools` while preserving reconciliation capability for operators.
- [x] Remove the location switcher for non-admin users so assigned-lot operators do not appear to choose across locations they should not operate.
- [x] Improve the admin lot-switcher dropdown readability and visibility.
- [x] Reorder the left navigation to the agreed operational-first sequence, with admin-only entries grouped at the end.

Success gate:
- An admin can manage global parking operations, lot assignments, and lot inventory from the dashboard, operators are restricted to their assigned lots, customer and dashboard account boundaries are explicit, and multi-lot data is visible consistently across backend, mobile, and web surfaces without direct database intervention for normal setup.

Dependencies:
- Track A
- Track B
- Track D

Rollback/fallback:
- retain the current bootstrap admin plus manual SQL assignment path only for internal testing while the first admin control plane slice is being built

Future polish:
- invitation-based operator onboarding
- lot templates and bulk assignment tools
- admin analytics and customer-support tooling

Implementation:
- [apps/parking-app-operator/app/dashboard/access-control/page.tsx](../apps/parking-app-operator/app/dashboard/access-control/page.tsx)
- [apps/parking-app-operator/app/dashboard/customers/page.tsx](../apps/parking-app-operator/app/dashboard/customers/page.tsx)
- [apps/parking-app-operator/app/dashboard/manage-parking-lots/page.tsx](../apps/parking-app-operator/app/dashboard/manage-parking-lots/page.tsx)
- [apps/parking-app-operator/app/dashboard/parking-setup/page.tsx](../apps/parking-app-operator/app/dashboard/parking-setup/page.tsx)
- [apps/parking-app-operator/app/api/operator/customers/route.ts](../apps/parking-app-operator/app/api/operator/customers/route.ts)
- [apps/parking-app-operator/app/api/operator/dashboard-accounts/route.ts](../apps/parking-app-operator/app/api/operator/dashboard-accounts/route.ts)
- [apps/parking-app-operator/app/api/operator/location-assignments/route.ts](../apps/parking-app-operator/app/api/operator/location-assignments/route.ts)
- [apps/parking-app-operator/app/api/operator/locations/route.ts](../apps/parking-app-operator/app/api/operator/locations/route.ts)
- [apps/parking-app-operator/components/dashboard/location-management-panel.tsx](../apps/parking-app-operator/components/dashboard/location-management-panel.tsx)
- [apps/parking-app-operator/lib/customerOversight.ts](../apps/parking-app-operator/lib/customerOversight.ts)
- [apps/parking-app-operator/lib/operatorAdminAccess.ts](../apps/parking-app-operator/lib/operatorAdminAccess.ts)
- [apps/parking-app-operator/lib/operatorLocationServer.ts](../apps/parking-app-operator/lib/operatorLocationServer.ts)
- [apps/parking-app-operator/lib/operatorLocationAccess.ts](../apps/parking-app-operator/lib/operatorLocationAccess.ts)
- [apps/parking-app-operator/lib/operatorPermissions.ts](../apps/parking-app-operator/lib/operatorPermissions.ts)
- [apps/parking-app-operator/lib/auth-context.tsx](../apps/parking-app-operator/lib/auth-context.tsx)
- [supabase/seed.sql](../supabase/seed.sql)
- [apps/parking-app-operator/README.md](../apps/parking-app-operator/README.md)
- [supabase/README.md](../supabase/README.md)

Validation method:
- `npm --workspace apps/parking-app-operator run test`
- `npm --workspace apps/parking-app-operator run build`
- `git diff --check`
- Statically verified admin-only dashboard-role provisioning and parking-lot management route enforcement, service-role containment, non-admin assigned-location filtering, operator-side location refresh after admin lot changes, multi-lot seed data, and documentation of dashboard-versus-customer identity boundaries.
- Statically verified the dashboard-account route can now invite a new Supabase Auth user through the server-side admin path while preserving the existing-user role-provisioning flow and `admin_user_roles` gate.
- Statically verified the operator dashboard now uses the agreed sidebar order, keeps admin-only control-plane entries hidden from non-admin roles, exposes an assigned-lot display instead of a non-admin switcher, preserves an improved admin lot switcher, and labels the reconciliation surface as `Operator Tools` while keeping the existing route path stable.
- Statically verified the new admin-only customer oversight route and page aggregate reservation, session, payment, lot, and dashboard-overlap data into a read-only control-plane surface without broadening non-admin visibility.
- Mobile automated tests were not rerun in this slice because no mobile source files changed; repo review confirmed the mobile app still reads shared backend `locations` inventory rather than an operator-only source.

Remaining gap before success gate:
- The Access Control, Manage Parking Lots, and Parking Setup flows still need non-production Supabase proof with real dashboard accounts, role provisioning, operator assignments, and lot create-update-deactivate rehearsal.
- `admin@example.com` remains the non-production bootstrap convention; production-safe invitation or onboarding is still future work.
- Invitation-based dashboard onboarding now exists in repo, but live email delivery, first-login completion, and staging proof are still future work.
- The first admin-only customer oversight surface now exists in repo, but real-data staging proof plus broader support workflows and admin analytics still remain outside this first foundation slice.

## Do Next Queue

These are the next tasks we should actively execute in order.

1. `Track K` staging follow-up: prove admin lot management, invitation-based dashboard onboarding, and the new customer oversight surface against Supabase in non-production.
2. `Track D` plus `Track H` staging follow-up: provision operator-location assignments and prove valid, duplicate, expired, cancelled, completed, wrong-location, unauthorized-location, and concurrent scans in staging.
3. `Track A` manual follow-up: rehearse one fresh `staging` bootstrap and one rollback drill against a non-production Supabase project using the rebuilt baseline.
4. `Track D` plus `Track H` repo follow-up: define the backend paid-exit authorization contract so the now-visible exit scan/manual verification surface can become real.
5. `Track C` manual follow-up: deploy the cleanup function, enable the scheduler, and observe expiry, slot release, and audit events in staging.
6. `Track E`: payment provider decision and backend settlement design.
7. `Track G`: establish the first observability and analytics baseline around the launch-critical flows.

## Recommended Parallel Work Split

If multiple builders are available, this is the safest split:

- Builder 1: Track A staging bootstrap and rollback rehearsal against the rebuilt baseline when credentials and a target are available.
- Builder 2: Track K admin customer-oversight implementation review or staging proof for the already-built control-plane foundations.
- Builder 3: Track D plus Track H staging proof and paid-exit contract design for the new Parking Actions surface.
- Builder 4: Track C cleanup deployment, scheduler activation, and operator acceptance in staging.
- Builder 5: Track G analytics event taxonomy and logging plan.

## Definition Of Done For This Stage

This execution tracker becomes useful only if we keep it current.

For every completed task:
- update status
- link the implementation file or PR
- record the validation method
- note what remains as polish rather than silently stretching the scope
