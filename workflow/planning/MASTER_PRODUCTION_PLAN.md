# Master Production Plan

This document is the main planner for the Smart Parking Reservation System.

Planning rule:
- We do not move to the next major step until the current step passes its success gate.
- "Done" means implemented and validated at the level stated in the gate.
- "Partial" means meaningful progress exists, but the gate has not been met yet.
- Each step includes future polish so we can separate launch-critical work from later commercial expansion work.

## Production Standard

For this project, "production-ready" means more than shipping working screens.

It means:

- the backend is the source of truth for reservations, sessions, billing, and operator state
- the backend owns gate-entry validation, parking grace windows, exit grace windows, penalties, and compensation outcomes
- the mobile customer journey is understandable, reliable, and defensible in real-world use
- the operator webapp can run a live parking location without direct database intervention
- the security model holds under common abuse and role misuse
- the system can be released, monitored, supported, and rolled back safely
- the product can be used in controlled commercial operations without hidden manual dependencies masquerading as automation

## Commercial Deployment Posture Right Now

Current posture:
- `Pre-pilot integration build`

Interpretation:
- the product has meaningful functional depth across mobile, operator, shared contracts, and Supabase
- the system is strong enough for serious internal validation and staged production hardening
- the system is not yet broad-commercial ready
- a controlled pilot may become realistic only after launch-critical backend, security, validation, and operational gaps are closed

## Product Surfaces In Scope

### Customer mobile app

The mobile app currently covers:

- splash and onboarding
- guest and authenticated entry paths
- login, register, and OTP flows
- home and parking-lot browsing
- slot selection and reservation flow
- reservation entry-ticket QR presentation
- arrival validation flow
- active parking session flow
- payment, exit, and receipt screens
- walk-in confirmation and walk-in QR flow
- menu, profile, vehicle, phone, and payment-method screens
- workflow recovery and persisted session state

### Operator webapp

The operator webapp currently covers:

- location-scoped authentication and dashboard access
- dashboard metrics and system-health surfaces
- reservations and audit views
- parking map and map-builder flows
- parking setup and slot administration
- admin tools and operator-scoped API routes
- pricing settings and reconciliation utilities
- location context, layout safety, and operator permission logic

Current structural limit:

- the webapp still behaves mostly like one shared operations surface, not yet as a clearly separated `admin plus operator` control plane with distinct global versus lot-scoped powers

### Backend and data platform

The backend currently includes:

- shared contracts in `packages/shared`
- Supabase-backed domain tables for locations, slots, reservations, sessions, payments, vehicles, and operator events
- RPC flows for reserve, start session, cancel reservation, end session, and walk-in entry/session start
- realtime publication setup for key parking data
- supporting SQL for pricing, layout, admin hardening, and reconciliation

## Canonical Customer Parking Lifecycle

This is the intended production flow the app should align to:

1. The user reserves a slot and immediately receives an entry QR ticket in the app.
2. The gate scans that QR ticket on arrival, the operator or gate flow is redirected to the matching reservation, and lot entry is confirmed.
3. Once entry is confirmed, the parking session becomes active in backend state without requiring a second QR scan for slot validation.
4. A short parking grace countdown begins so the user can physically park in the reserved slot; when that grace window ends, the metered parking timer starts.
5. The user is expected to occupy the reserved slot. If there is a slot conflict, the app should drive the exception flow, preserve auditability, and compensate the affected user automatically according to policy.
6. Before leaving, the user pays the ticket in the app and receives exit authorization with a leave-the-slot grace period.
7. The exit QR stays valid only during that leave grace window. If the user does not leave in time, the QR expires and overstay penalties apply.
8. If something goes wrong at any stage, the app should route the user into a clear support or operator contact path instead of leaving them in an undefined state.

## Current Reality Snapshot

### Confirmed done

- [x] Monorepo structure for mobile, operator, shared contracts, and Supabase artifacts
- [x] Mobile route coverage for onboarding, auth, reservation, arrival, session, payment, receipt, walk-in, and settings flows
- [x] Workflow persistence and recovery support in the mobile app
- [x] Shared pricing and parking-map contract foundations
- [x] Supabase schema and RPC coverage for the core reservation-backed lifecycle
- [x] Backend-native walk-in entry-pass issuance and walk-in session-start foundation
- [x] Operator dashboard foundation with location scoping, reservations, audit, map, slot, pricing, and admin-tool surfaces
- [x] Security baseline with RLS foundation, operator role concepts, and server-side privileged access patterns
- [x] Test suites exist for key mobile workflow contracts and operator route or permission contracts
- [x] Android and iOS build script foundations exist for the mobile app

### Confirmed partial

- [~] Environment and deployment discipline exists in fragments, but the durable production operating layer needs to be re-solidified
- [~] Reservation lifecycle is backend-aware, but some customer-facing fallback or sample-data behavior still needs production-safe tightening
- [~] The repo now presents entry-pass-first reservation and walk-in UX, and repo-side backend gate confirmation with parking-grace session activation has been accepted; production scanner integration, staging execution, exit grace, penalty, and compensation enforcement remain open
- [~] Walk-in flow is significantly more real than before, but timeout automation and full operator visibility are not complete
- [~] Mobile UI and UX are broad in coverage, but launch-quality error copy, recovery states, and field-validated scanning UX are not complete
- [~] Operator web UX is operationally meaningful, but heavy views, detail actions, and high-volume ergonomics still need hardening
- [~] Admin and operator role concepts exist, but the app still needs explicit admin-versus-operator separation, admin-managed lot assignment, and clearer customer-versus-dashboard account boundaries
- [~] Security posture has real foundations, but rate limiting, abuse protection, secret review, and end-to-end hardening are unfinished
- [~] Observability exists only as early state surfaces and partial realtime visibility, not as a production telemetry stack
- [~] Commercial billing logic exists only as a foundation, not as a gateway-backed settlement system

### Confirmed not done

- [ ] Real payment provider integration and finance-safe settlement lifecycle
- [ ] Gate-entry QR activation has a reviewed backend contract, but scanner-client integration, staging proof, paid-exit grace, and exit-grace QR expiry are not yet aligned end to end in production code
- [ ] The dashboard still needs a production-safe admin control plane for global lot management, operator-account assignment, and customer-versus-dashboard identity boundaries
- [ ] Server-owned expiry, no-show, and housekeeping automation
- [ ] Full production-safe environment, rollback, and release discipline
- [ ] End-to-end security hardening for mobile, webapp, privileged routes, and SQL functions
- [ ] Production-grade observability, crash reporting, alerting, and analytics instrumentation
- [ ] Full real-device release validation across the launch customer journey
- [ ] Commercial pilot operating package with SOPs, support model, partner dashboarding, and controlled launch guardrails

### Current limits and operating constraints

- [ ] Broad commercial rollout is not yet safe
- [ ] Payments remain operationally incomplete for real-money production use
- [ ] Current repo flow now has a repo-accepted backend-owned operator gate confirmation contract, but still lacks an operator scanner client, exit-authorization QR handling, and automated penalty or compensation enforcement
- [ ] The current webapp still needs explicit `admin` versus `operator` experience separation, admin-managed operator assignment, and shared mobile/backend multi-lot parity before broader operations can be trusted
- [ ] Walk-in lifecycle still needs server housekeeping and richer operator visibility before it can be trusted at scale
- [ ] Penalty, compensation, and support escalation behavior are not yet modeled end to end as backend-owned commercial flows
- [ ] Some environment or rollout documentation was intentionally removed as outdated and now needs current-state replacement
- [ ] Current repo validation history is useful, but this plan should not assume every existing dirty-worktree change has already passed a fresh full validation run

## Commercial Scope And Launch Boundaries

### Intended initial commercial use

The correct near-term target is:

- one controlled pilot location
- trained operators and guards
- limited customer volume
- explicit engineering oversight during early commercial use

### Not yet supported as a mature commercial promise

The product should not yet claim:

- broad multi-site rollout readiness
- self-healing operational automation
- fully automated finance reconciliation
- hardened anti-abuse maturity
- store-release confidence across the full supported device matrix
- resilient production monitoring and incident response

### Mandatory conditions before real pilot traffic

- backend-correct reservation lifecycle
- backend-correct walk-in lifecycle
- real payment strategy
- real gate-entry and exit-authorization QR strategy
- operator exception and compensation workflows
- security and privileged-access review
- release and rollback readiness

## Master Sequence

## Phase 0 - Product, Market, and Commercial Operating Model

Status:
- [~] Partial

Already done:
- [x] Core concept is clear at a high level: reserve a slot, enter through a validated gate ticket, park within a grace window, run a timed session, pay, and exit
- [x] Distinct customer mobile app and operator webapp already exist in the repo
- [x] The repo already implies a pilot-location-first operating model

Still required:
- [ ] Define launch market and pilot-location selection criteria
- [ ] Define first commercial customer and partner profile
- [ ] Define reservation fee, parking fee, refund, and exception policy for commercial use
- [ ] Define penalty and compensation policy for wrong-slot use, exit overstay, and operator-caused conflict
- [ ] Define guard, operator, support, finance, and founder escalation ownership
- [ ] Define explicit launch boundaries: what the app will support, what stays manual, and what remains out of scope

Success gate:
- One written commercial operating model exists that covers customer promise, operator promise, pricing rules, exception handling, launch limits, and pilot success criteria.

Future polish:
- Corporate packages
- Loyalty and membership layers
- Fleet and commuter offerings

## Phase 1 - Platform, Environments, and Release Operations

Status:
- [~] Partial

Already done:
- [x] Monorepo and workspace structure are in place
- [x] Mobile build scripts and EAS profiles exist
- [x] Shared contracts support code reuse across app surfaces
- [x] Supabase remains the central backend platform

Still required:
- [ ] Rebuild a current environment matrix for local, staging, pilot-production, and production
- [ ] Rebuild a current migration, rollback, and backup procedure from actual repo reality
- [ ] Define secret ownership, rotation expectations, and storage policy
- [ ] Define release ownership and signoff path for mobile and operator deployments
- [ ] Define compatibility sequencing for SQL, mobile, and operator rollouts
- [ ] Define production-safe data policy for demo, fallback, and seed behavior

Success gate:
- Every deployment environment has a current owner, rollout path, rollback path, backup posture, and configuration policy that the team can actually execute.

Future polish:
- CI-backed migration validation
- automated environment drift detection
- more formal deployment diagrams

## Phase 2 - Security, Identity, and Trust Foundation

Status:
- [~] Partial

Already done:
- [x] Mobile auth foundations exist
- [x] Guest access mode exists
- [x] Operator role concepts and scoped server access exist
- [x] RLS and admin-hardening foundations exist in Supabase artifacts
- [x] Operator route validation and permission tests exist

Still required:
- [ ] Finalize production auth posture for customer launch
- [ ] Separate customer mobile identities from operator/admin dashboard identities and define whether shared-account overlap is allowed
- [ ] Define the bootstrap admin path and the production-safe operator/admin provisioning model
- [ ] Review all privileged server routes and service-role usage for least privilege
- [ ] Audit `security definer` SQL functions for production safety
- [ ] Add rate limiting and abuse protections for auth, reservation, walk-in, and operator actions
- [ ] Add device-session and suspicious-account controls
- [ ] Review PII handling for phone, vehicle, payment, and audit metadata
- [ ] Define incident response, credential exposure, and access review procedures

Success gate:
- The project can withstand common startup-scale abuse, accidental privilege misuse, and silent trust failures without relying on luck or tribal knowledge.

Future polish:
- anomaly detection
- device fingerprinting
- stronger identity verification for high-trust flows

## Phase 3 - Backend Domain And Data Correctness

Status:
- [~] Partial, with strong foundations already implemented

Already done:
- [x] Core tables exist for slots, reservations, sessions, payments, vehicles, and operator events
- [x] Reservation-backed lifecycle RPCs exist for reserve, start, cancel, and end
- [x] Pricing and parking-layout support SQL exists
- [x] Walk-in entry issuance and walk-in session-start foundations now exist in backend artifacts
- [x] Reconciliation and admin-hardening support SQL exists

Still required:
- [ ] Tighten reservation concurrency and slot-state race handling
- [~] Model gate-entry confirmation, parking grace, metered-session start, paid-exit grace, and penalty states as backend-authoritative transitions. Gate-entry and parking-grace activation are implemented in repo; paid-exit grace and penalty states remain open.
- [ ] Complete server-owned expiry, no-show, and stale-state cleanup behavior
- [ ] Ensure walk-in inventory rules cannot corrupt reserved inventory
- [ ] Ensure all status transitions remain backend-authoritative under retries and partial failures
- [ ] Define automatic conflict-resolution outcomes, compensation writes, and operator-visible audit trails
- [ ] Define long-term migration discipline for schema evolution
- [ ] Clarify archival, retention, and export posture for receipts, sessions, audit events, and partner reporting

Success gate:
- Backend state alone can explain and recover the full parking lifecycle, including reservation, walk-in, session, exit, payment state, and operator-visible audit outcomes.

Future polish:
- deeper data warehousing strategy
- partner reporting exports
- stronger historical archive tooling

## Phase 4 - Customer Mobile App UX And Frontend Completion

Status:
- [~] Partial, broad UI coverage exists

Already done:
- [x] Splash, onboarding, auth, and guest entry surfaces exist
- [x] Home, lot browsing, slot selection, and reservation screens exist
- [x] Arrival, session, payment, exit, and receipt screens exist
- [x] Walk-in confirmation and walk-in QR flow exist
- [x] Menu, profile, vehicle, phone, and payment-method screens exist
- [x] UI primitives, map views, QR presentation, and status-card patterns exist
- [x] Persisted workflow recovery exists

Still required:
- [ ] Replace remaining production-risk fallback states with clearly safe UX
- [ ] Align the customer flow to one primary contract: reservation QR for gate entry, no slot-validation scan after entry, parking grace, metered session, payment, and exit grace
- [ ] Present clear parking-grace and leave-the-slot countdown states with penalty messaging
- [ ] Improve stale-slot, offline, retry, and degraded-state customer messaging
- [ ] Add launch-quality copy and visual trust signals across critical states
- [ ] Add issue-reporting or contact-support paths at reservation, entry, conflict, payment, and exit failure points
- [ ] Validate the real ergonomics of reservation, gate entry, parking grace, payment, exit, and receipt flows on-device
- [ ] Ensure settings and account-management surfaces match actual backend capability rather than placeholder expectations

Success gate:
- A real customer can understand, trust, and complete the parking journey on a real device without confusing fallback states, broken expectations, or hidden manual rescue paths.

Future polish:
- richer slot navigation guidance
- premium map and occupancy visuals
- deeper account history and customer self-service

## Phase 5 - Operator Webapp UX And Command Center Completion

Status:
- [~] Partial, operationally meaningful base exists

Already done:
- [x] Operator login and location-scoped dashboard foundations exist
- [x] Dashboard metrics, recent reservations, and system-health surfaces exist
- [x] Map, map-builder, slots, reservations, audit, and admin-tools routes exist
- [x] Pricing settings, sync planning, and reconciliation foundations exist
- [x] Operator route schemas, permission logic, and location scoping foundations exist

Still required:
- [ ] Break heavy aggregate views into paginated or more specialized data contracts
- [ ] Split the shared operations app into explicit `admin` and `operator` experiences, where admin owns all-lot control and operators stay restricted to assigned locations
- [ ] Add admin-managed parking-lot assignment and operator-account management so normal lot assignment does not require direct SQL
- [ ] Add multi-lot parity across backend, mobile, and dashboard surfaces, including at least two more testing lots in backend-backed data
- [ ] Add richer detail drawers, operator notes, and safe destructive-action approval flows
- [ ] Add operator-facing Parking Actions for entry scan, manual gate confirmation, conflict, compensation, exit scan, and exit-overstay exception handling
- [ ] Add shift handoff, unresolved issue logging, and incident communication UX
- [ ] Improve resilience and ergonomic behavior for high-volume operational use
- [ ] Improve degraded-state banners, fallback handling, and realtime failure visibility

Success gate:
- Operators can run a live site through normal traffic, mismatches, walk-ins, disputes, and degraded conditions without direct engineering or database intervention.

Future polish:
- multi-location control center
- staffing productivity views
- operator SLA and throughput analytics

## Phase 6 - Payments, Billing, Receipts, And Finance Operations

Status:
- [~] Partial foundation only

Already done:
- [x] Pricing and fee-calculation foundations exist
- [x] Payment-selection and receipt-related UI surfaces exist
- [x] Backend payment table exists
- [x] Current session completion flow writes a manual paid-row path

Still required:
- [ ] Select a real payment provider and commercial integration model
- [ ] Implement payment intent, capture, timeout, refund, and reversal lifecycle
- [ ] Add webhook handling and idempotent settlement logic
- [ ] Separate accounting paths for reservation fee, parking fee, refund, and failed charge outcomes
- [ ] Add accounting rules for penalties, compensation credits, fee waivers, and operator-approved reversals
- [ ] Add payment failure UX and finance-visible discrepancy views
- [ ] Add receipt retention, finance exports, and reconciliation posture suitable for pilot operations

Success gate:
- Real money can be authorized, captured, reconciled, refunded, and audited without double-charge paths or spreadsheet-only operational truth.

Future polish:
- wallet or stored value
- promo and subscription models
- advanced commercial pricing experiments

## Phase 7 - Realtime, Automation, And Operational Housekeeping

Status:
- [~] Partial

Already done:
- [x] Realtime publication support exists for major domain tables
- [x] Notification scheduling foundations exist in mobile code
- [x] Workflow recovery and sync-state surfaces already exist
- [x] Some operator sync and system-health surfaces already exist

Still required:
- [ ] Add server-owned reservation expiry automation
- [ ] Add walk-in pass invalidation and held-slot release automation
- [ ] Add server-owned parking-grace and paid-exit-grace countdown enforcement
- [ ] Add no-show and stale-session housekeeping paths
- [ ] Add automatic penalty application and compensation-trigger automation where policy requires it
- [ ] Define reconciliation automation boundaries versus manual operator actions
- [ ] Validate notification behavior in real release builds
- [ ] Add guardrails so degraded realtime never silently misleads operators or customers

Success gate:
- Time-based state changes, stale inventory cleanup, and operational reconciliation do not depend on users reopening the app or on ad hoc manual cleanup.

Future polish:
- richer proactive notifications
- deeper operational automation
- integrations with gates, kiosks, or sensors

## Phase 8 - Observability, Analytics, And Reporting

Status:
- [ ] Not done at production level

Already done:
- [x] Some in-product sync or health indicators exist
- [x] Realtime and dashboard state models expose early operational signals

Still required:
- [ ] Add structured logs and request correlation for backend and operator paths
- [ ] Add mobile crash reporting and release health
- [ ] Add backend latency, refresh failure, and action-failure metrics
- [ ] Add product funnel events across reservation, arrival, session, payment, and receipt stages
- [ ] Add operational KPI and commercial KPI dashboards
- [ ] Add alert thresholds, escalation rules, and incident visibility

Success gate:
- The team can answer what is broken, who is affected, where revenue is leaking, and where conversion drops occur within minutes, not after manual digging.

Future polish:
- predictive occupancy
- utilization forecasting
- pricing and retention recommendations

## Phase 9 - QA, Release Engineering, And Device Validation

Status:
- [~] Partial

Already done:
- [x] Mobile test suite exists
- [x] Operator test suite exists
- [x] Mobile typecheck command exists
- [x] Mobile Android and iOS build command paths exist
- [x] Operator build command exists

Still required:
- [ ] Reconfirm validation baseline after current worktree stabilizes
- [ ] Add operator typecheck or equivalent standard validation path
- [ ] Add route-level, device-level, and full-journey validation scripts
- [ ] Validate notifications, QR flows, reservation, walk-in, session, payment, and receipt on real devices
- [ ] Decide and validate iOS scope explicitly if it remains in launch scope
- [ ] Define release signoff owners and release-candidate checklist

Success gate:
- A release candidate passes automated validation and a human-run real-device end-to-end script across normal flow and core failure paths.

Future polish:
- device-farm automation
- synthetic journey monitoring
- stronger preflight release gates

## Phase 10 - Controlled Pilot Readiness And Commercial Use

Status:
- [ ] Not done

Still required:
- [ ] Choose the first pilot site, slot count, operating hours, and customer volume assumptions
- [ ] Define pilot support rota and escalation tree
- [ ] Prepare operator, guard, signage, QR placement, and fallback SOPs
- [ ] Define launch-day manual interventions that are allowed versus forbidden
- [ ] Define partner-facing reporting and pilot success metrics
- [ ] Dry-run dispute, payment-failure, wrong-slot, and degraded-connectivity scenarios

Success gate:
- The team can operate one controlled live location with real customers, real operators, and real issue handling without engineering directly editing data during normal operation.

Future polish:
- partner onboarding toolkit
- replicated pilot playbooks
- location launch templates

## Phase 11 - Scale, Platform Expansion, And Moat

Status:
- [ ] Not started

Still required:
- [ ] Define multi-location data and operator segmentation strategy
- [ ] Add partner reporting, invoicing, and utilization benchmarking layers
- [ ] Create experimentation framework for pricing and arrival windows
- [ ] Define integration roadmap for gates, ANPR, sensors, and building systems
- [ ] Clarify long-term commercial differentiation and defensibility metrics

Success gate:
- The system can scale from one controlled pilot to multiple locations without rewriting the operating model or the platform's core architecture.

Future polish:
- corporate accounts
- subscription parking
- gate automation
- predictive assignment

## Production Limitations To Watch Now

### 1. Environment and release discipline are weaker than the product surface depth

Risk:
- the product may look more complete than the operating system around it actually is

Impact:
- rollout mistakes, bad rollback posture, environment confusion, and support fragility

What must happen before pilot:
- rebuild current environment, migration, backup, and release discipline from actual repo reality

### 2. Payments are not commercially complete

Risk:
- current payment state is not a gateway-backed production commercial system

Impact:
- revenue leakage, finance ambiguity, low trust

What must happen before pilot:
- provider integration, webhook logic, settlement posture, refund and failure handling

### 3. Gate-entry and exit QR lifecycle is not yet aligned in production code

Risk:
- the product now has backend authority for gate entry in repo code, but still lacks the operator-facing scanner client, live staging proof, and full exit-authorized lifecycle

Impact:
- trust loss, wrong-slot friction, operator rescue burden, and unclear penalty handling

What must happen before pilot:
- one operator-usable gate-entry scan path, staging-proven backend confirmation, grace-period, payment, exit, penalty, and recovery contract with real-device validation

### 4. Walk-in is closer to production than before, but not finished

Risk:
- walk-in state can still drift without timeout automation and richer operator review surfaces

Impact:
- inventory mismatch, audit gaps, operator confusion

What must happen before pilot:
- server housekeeping plus operator visibility and exception handling

### 5. Security and abuse resistance are not yet at commercial-strength depth

Risk:
- common startup-scale misuse or privilege regressions may still slip through

Impact:
- trust loss, revenue loss, operator misuse, hidden vulnerabilities

What must happen before pilot:
- service-role review, SQL hardening review, rate limiting, and response playbooks

### 6. Observability is still too weak for commercial confidence

Risk:
- the team may not know quickly enough what failed, who was affected, or where revenue is leaking

Impact:
- slow incident response, long debugging cycles, poor partner confidence

What must happen before pilot:
- structured logs, crash reporting, metrics, alerts, and KPI dashboards

## Analytics And Decision Framework

### Customer journey metrics

- app open to authenticated rate
- authenticated user to vehicle-added rate
- lot-opened to slot-selected rate
- slot-selected to reservation-created rate
- reservation-created to gate-entry-scanned rate
- gate-entry-scanned to parking-grace-completed rate
- parking-grace-completed to metered-session-started rate
- session-started to session-completed rate
- session-completed to payment-success rate
- payment-success to exit-grace-completed rate
- exit-grace-completed to receipt-viewed rate

### Reservation and walk-in quality metrics

- reservation success rate
- reservation expiration rate
- walk-in issuance to session-start rate
- no-show rate
- wrong-slot attempt rate
- occupied-slot dispute rate
- penalty incidence rate
- compensation incidence rate
- average time from reservation to arrival

### Utilization and revenue metrics

- occupancy by slot, location, hour, and day
- revenue per slot-hour
- reservation-fee revenue versus parking-fee revenue
- average session duration
- average billed amount
- payment failure rate
- refund rate

### Operator performance metrics

- slot mismatch rate
- reconciliation count
- manual override count
- average time to resolve disputes
- realtime degradation incidents
- dashboard action failure count

### Reliability metrics

- mobile crash-free sessions
- operator crash-free sessions
- API latency by route
- realtime lag
- refresh failure rate
- notification delivery success rate
- QR validation failure rate

## Required Pre-Pilot Dashboards

- executive dashboard for revenue, utilization, repeat usage, and active pilot health
- operations dashboard for slot accuracy, realtime health, disputes, and reconciliations
- product dashboard for funnel conversion and drop-off
- finance dashboard for payment success, refunds, and settlement mismatches
- release dashboard for crash rate, incident count, and environment health

## Suggested Immediate Execution Order

1. Re-solidify Phase 1 environment and release operations now that outdated docs were intentionally removed.
2. Connect the accepted gate-entry backend contract to an operator-facing Parking Actions scan and manual confirmation surface.
3. Complete Phase 3 and Phase 4 hardening around exit authorization, grace periods, penalties, compensation, and customer failure lifecycle.
4. Finish Phase 5 and Phase 7 gaps around walk-in operator visibility and server housekeeping.
5. Build Phase 6 real payment integration and finance-safe settlement.
6. Build Phase 8 observability and incident readiness before any live commercial traffic.
7. Run Phase 9 real-device validation and release discipline.
8. Execute Phase 10 controlled pilot readiness.

## First Automated Workflow Cycle Recommendation

The next planner cycle after the accepted gate-entry backend slice should focus on:

- turning the reviewed gate-entry API into an operator-facing Parking Actions entry scan and manual confirmation workflow
- keeping exit scan visible as a planned flow while blocking actual exit confirmation on a backend-owned paid-exit authorization contract
- preserving Track A staging bootstrap, SQL deployment, and concurrency rehearsal as explicit manual follow-ups

That cycle should not imply that exit authorization, payments, penalties, or live database proof are complete.

## Validation Baseline For This Plan Update

- [x] Repo structure, mobile features, operator surfaces, package manifests, tracker, and execution log were re-audited for this planning refresh
- [ ] No fresh test run was performed as part of this document-only update

## How We Should Use This Plan

This document is the main project planning anchor.

Use it to:

- decide what matters before launch
- decide what is truly launch-critical versus later polish
- set the active tracker
- guide planner briefs
- justify commercial limits and rollout posture

The tracker, baton, prompt, execution log, review remarks, and automation loop should all derive from this document rather than competing with it.
