# AI Developer Prompt - Next Move

This file is the planner-issued working brief for the active cycle.

It is not a durable source of truth and it does not outrank the plan, tracker, workflow state, or the repo itself.

Before acting on any prompt written here, read:

1. [MASTER_PRODUCTION_PLAN.md](../planning/MASTER_PRODUCTION_PLAN.md)
2. [ACTIVE_EXECUTION_TRACKER.md](../planning/ACTIVE_EXECUTION_TRACKER.md)
3. [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md)
4. [AI_DEVELOPER_EXECUTION_LOG.md](../logs/AI_DEVELOPER_EXECUTION_LOG.md)
5. [AI_REVIEWER_REMARKS.md](../logs/AI_REVIEWER_REMARKS.md)
6. [SUGGESTIONS_AND_IMPROVEMENTS_LOG.md](../logs/SUGGESTIONS_AND_IMPROVEMENTS_LOG.md)
7. [DEBUGGER_OUTPUT_LOG.md](../logs/DEBUGGER_OUTPUT_LOG.md)
8. [PROJECT_DOCUMENT_INDEX.md](../planning/PROJECT_DOCUMENT_INDEX.md)
9. Any relevant durable project document linked from the project document index

## Current Prompt

### 2026-06-27 - Track D/H Paid-Exit Authorization Contract Slice

- `Objective`:
  Implement the first repo-backed paid-exit authorization contract so the mobile app and operator dashboard have a backend-owned source of truth for post-payment exit QR eligibility, exit grace expiry, and operator exit verification, without implementing a real payment provider or penalty engine in this cycle.

- `Why now`:
  Track L pass 1 and pass 2 were accepted with follow-ups, so the next highest repo-executable blocker is the currently documented Track D/H gap: exit verification remains visible but intentionally blocked because the backend paid-exit authorization contract does not exist yet. The top Track K, Track D/H staging, and Track A items need external Supabase or environment proof, while this contract can be advanced safely in repo code and will unblock later scanner, staging, and payment-provider work.

- `In scope`:
  Compare this brief against the real repo state before editing, especially `supabase/end_parking_session.sql`, `apps/mobile/src/lib/reservations.ts`, `apps/mobile/src/features/parking/store/useParkingFlowStore.ts`, `apps/mobile/src/features/parking/screens/PaymentScreen.tsx`, `apps/mobile/src/features/parking/screens/ExitScreen.tsx`, `apps/parking-app-operator/app/api/operator/gate-entry/route.ts`, `apps/parking-app-operator/components/dashboard/parking-action-controls.tsx`, and the operator route schema or contract tests.
  Define and implement a backend-owned exit authorization model for the current manual-paid path. It should only authorize exit after the session is completed or paid according to existing repo semantics, return a durable exit code or token, return an exit-grace deadline derived from the lot or reservation pricing config, and be safe to replay idempotently.
  Add or update Supabase SQL artifacts for the paid-exit authorization and/or verification contract. Prefer a small additive artifact if that is safer than rewriting the existing `end_parking_session` contract; if the existing function must change, preserve backward compatibility for current mobile callers where practical.
  Add an operator API route for exit verification that mirrors the safety posture of `/api/operator/gate-entry`: authenticated operator, capability check, active-location resolution, exact location assignment enforcement, service-role RPC call, structured errors, and route logging.
  Update the operator Parking Actions/detail controls so exit verification is no longer merely a disabled placeholder when an eligible paid/completed session has a backend exit token, while still clearly blocking ineligible sessions.
  Update the mobile session/payment/exit data mapping only as needed so the exit screen uses backend-provided exit authorization fields when available and falls back safely for local/guest/demo flows without overstating production payment support.
  Add focused tests or contract coverage for the new SQL artifact names, route schema, permission/location enforcement expectations, eligible/ineligible exit states, and mobile mapping of backend exit authorization fields.
  Update durable docs and tracker notes only where the project state changes, and keep staging proof, real payment-provider settlement, scanner hardware proof, penalties, and compensation explicitly open.

- `Out of scope`:
  Do not integrate Stripe, PayMongo, GCash, Maya, Apple Pay, Google Pay, or any real payment provider.
  Do not implement webhook settlement, refunds, reversals, finance exports, or real-money reconciliation.
  Do not implement penalty charging, compensation credits, wrong-slot dispute handling, or automatic overstay enforcement beyond recording/returning the exit grace boundary needed by this contract.
  Do not claim live Supabase staging proof, scanner hardware proof, or full Track D/H success-gate completion.
  Do not reopen Track L layout work unless a tiny copy or state-display adjustment is directly required to represent the new exit authorization contract.
  Do not change admin/operator role policy beyond the narrow capability and location checks needed for exit verification.

- `Dependencies to respect`:
  Existing entry confirmation, parking grace, manual-paid `end_parking_session`, operator location assignment, and Track K role boundaries are accepted baselines.
  Track A staging bootstrap, Track K staging proof, Track D/H scanner proof, debugger SQL rerun, and Android launch validation remain manual/external follow-ups and should not be represented as solved.
  Payment implementation remains deferred until the separate React Native/payment consultation changes direction; this cycle is a backend exit authorization bridge over the current manual-paid path.
  Track L live viewport proof remains open and should not be marked complete by this backend/operator slice.

- `Constraints`:
  Keep the contract small, replay-safe, and auditable.
  Preserve current mobile guest/local demo behavior; local flows may continue generating local exit codes as long as live/backend flows prefer backend authorization.
  Preserve current operator access boundaries: non-admin operators can only verify exit for their assigned active location, and admin/global visibility must not bypass location safety for mutation unless existing route patterns already allow it explicitly.
  Prefer clear names that distinguish `payment completed`, `exit authorized`, and `exit verified` states instead of overloading one status ambiguously.
  If schema additions are needed, make SQL rerunnable where possible and update `supabase/README.md` with the deployment order or manual action.

- `Required validation`:
  If mobile files change, run `npm.cmd --workspace apps/mobile run test` and `npm.cmd --workspace apps/mobile run typecheck`.
  If operator files change, run `npm.cmd --workspace apps/parking-app-operator run test` and `npm.cmd --workspace apps/parking-app-operator run build`.
  Run `git -c safe.directory=C:/dev/parking_app diff --check`.
  Statically review the SQL artifacts for idempotency, auth assumptions, location scoping, replay behavior, and payment/exit state boundaries.
  If any validation cannot be run, record the exact reason and do not imply the contract is production-proven.

- `Success criteria`:
  The repo contains a clear backend-owned paid-exit authorization and operator verification contract for the current manual-paid path.
  Eligible paid/completed sessions can receive a backend exit token/code plus exit-grace deadline, and ineligible sessions remain blocked with clear errors.
  Operator exit verification uses the same authentication, capability, active-location, assignment, logging, and service-role safety patterns as accepted gate-entry verification.
  Mobile exit presentation can prefer backend exit authorization data when available without pretending real payment settlement exists.
  Tests and docs distinguish implemented repo contract from missing staging proof, scanner hardware proof, payment provider work, penalties, compensation, and full Track D/H completion.

- `Expected deliverable`:
  A focused Track D/H paid-exit authorization repo slice with SQL/API/mobile/operator/test/doc updates as needed, a factual developer execution-log entry, tracker/readiness updates where state changed, and a baton handoff to Reviewer.

- `Files likely involved`:
  `supabase/end_parking_session.sql`
  `supabase/schema.sql`
  `supabase/README.md`
  `supabase/paid_exit_authorization.sql` or an equivalently named new artifact if needed
  `apps/mobile/src/lib/reservations.ts`
  `apps/mobile/src/features/parking/store/useParkingFlowStore.ts`
  `apps/mobile/src/features/parking/types.ts`
  `apps/mobile/src/features/parking/screens/PaymentScreen.tsx`
  `apps/mobile/src/features/parking/screens/ExitScreen.tsx`
  `apps/mobile/tests/backendContract.test.mjs`
  `apps/mobile/tests/reservationContract.test.mjs`
  `apps/parking-app-operator/app/api/operator/exit-verification/route.ts`
  `apps/parking-app-operator/app/api/operator/gate-entry/route.ts`
  `apps/parking-app-operator/lib/operatorRouteSchemas.ts`
  `apps/parking-app-operator/lib/operatorPermissions.ts`
  `apps/parking-app-operator/components/dashboard/parking-action-controls.tsx`
  `apps/parking-app-operator/app/dashboard/parking-actions/page.tsx`
  `apps/parking-app-operator/tests/routeContractCoverage.test.js`
  `apps/parking-app-operator/tests/routeRequestValidation.test.mjs`
  `apps/parking-app-operator/tests/operatorPermissions.test.mjs`
  `apps/mobile/PRODUCTION_READINESS_CHECKLIST.md`
  `apps/parking-app-operator/PRODUCTION_READINESS_CHECKLIST.md`
  `workflow/planning/ACTIVE_EXECUTION_TRACKER.md`
  `workflow/logs/AI_DEVELOPER_EXECUTION_LOG.md`
  `workflow/runtime/AI_WORKFLOW_STATE.md`
  `workflow/temp/TRACK_DH_PAID_EXIT_CONTRACT_NOTES.md`

- `Reviewer focus areas`:
  Verify that exit authorization is backend-owned, replay-safe, and distinct from real payment-provider settlement.
  Verify operator exit verification cannot mutate sessions outside the operator's assigned active location and does not broaden admin/operator role powers accidentally.
  Verify mobile live/backend flows prefer backend exit authorization fields while local/demo fallback remains clearly scoped.
  Verify SQL artifacts are rerunnable or deployment-order-safe and docs do not claim staging proof, scanner proof, penalties, compensation, payment provider support, or full Track D/H completion.
  Verify the Developer did not use this cycle to reopen unrelated Track L UI polish, Track K control-plane work, or broad payment integration.

- `Next owner after developer closeout`:
  `Reviewer`
