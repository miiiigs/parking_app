# AI Developer Prompt - Next Move

This file is the planner-issued working brief for the active cycle.

It is not a durable source of truth and it does not outrank the plan, tracker, workflow state, or the repo itself.

Before acting on any prompt written here, read:

1. [MASTER_PRODUCTION_PLAN.md](../planning/MASTER_PRODUCTION_PLAN.md)
2. [ACTIVE_EXECUTION_TRACKER.md](../planning/ACTIVE_EXECUTION_TRACKER.md)
3. [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md)
4. [AI_DEVELOPER_EXECUTION_LOG.md](../logs/AI_DEVELOPER_EXECUTION_LOG.md)
5. [AI_REVIEWER_REMARKS.md](../logs/AI_REVIEWER_REMARKS.md)
6. [PROJECT_DOCUMENT_INDEX.md](../planning/PROJECT_DOCUMENT_INDEX.md)
7. Any relevant durable project document linked from the project document index

## Current Prompt

### 2026-06-23 - Backend-Owned Gate Entry Confirmation

- `Objective`:
  Implement the first gate-entry-first vertical slice: a location-scoped operator or gate confirmation must be the authority that converts a valid entry-pass reservation into an active backend parking session and records the parking-grace boundary. The customer app must observe that backend transition instead of activating its own session.

- `Why now`:
  Track A's remaining work requires external staging access, while this Track B plus Track D slice is the highest-priority repo-executable gap. The current mobile arrival screen presents the correct entry pass but still calls the customer-authenticated `start_parking_session` RPC from `Continue After Gate Scan`, so gate confirmation and session authority are not actually backend or operator owned.

- `In scope`:
  Audit the current schema, session RPCs, operator auth and location-scoping helpers, mobile workflow recovery, and dirty worktree before editing.
  Add a retry-safe SQL contract for confirming an entry pass that locks the reservation and slot, rejects missing, expired, cancelled, completed, wrong-location, or otherwise invalid reservations, creates or returns exactly one session, marks entry confirmation server-side, records an explicit parking-grace end time, updates slot state safely, and emits an operator audit event.
  Restrict the confirmation contract to the privileged server/operator path; do not trust a customer-supplied user id, location id, timestamp, grace duration, slot id, or fee.
  Add a location-scoped operator API action that accepts the reservation entry-pass payload or resolved reservation id, verifies the active operator location against the reservation's slot location, invokes the privileged confirmation contract, and returns an idempotent result suitable for scanner retries.
  Replace the mobile arrival self-start action with backend-state observation and recovery. The mobile app should remain on the entry-pass waiting state until a session exists, then hydrate that session and proceed to the session screen. Provide an explicit refresh or retry path; bounded polling is acceptable if it is lifecycle-safe and does not create the session.
  Apply the same authority rule to walk-in entry passes where the existing shared reservation/session model permits it, so neither reservation nor walk-in customers can bypass gate confirmation. Preserve valid existing walk-in issuance and expiry behavior.
  Add focused SQL, operator route, mobile contract, and workflow-recovery tests for authorization, location scope, invalid or expired entry passes, idempotent retries, grace timestamps, and customer non-authority.
  Update the Supabase artifact ordering or README if a new SQL artifact or schema compatibility step is introduced.

- `Out of scope`:
  Paid exit authorization QR, leave-the-slot grace, overstay penalties, wrong-slot disputes, compensation, payment-provider integration, staging deployment, scheduler activation, and real-device scanner validation.
  Do not restore slot-QR validation or the camera `/validate` route as the production activation path.
  Do not redesign unrelated operator dashboard views or customer screens.

- `Dependencies to respect`:
  `MASTER_PRODUCTION_PLAN.md` controls lifecycle semantics when older code, tests, logs, or temp notes disagree.
  Preserve Track A's documented SQL bootstrap ordering and explicit compatibility strategy.
  Preserve current reservation concurrency locks, backend-derived identity, location scoping, RLS boundaries, walk-in source tagging, expiry cleanup, and operator audit history.
  Treat existing dirty-worktree changes as user or prior-cycle work; integrate with them without reverting unrelated edits.

- `Constraints`:
  Use server timestamps for entry and grace boundaries. Store grace state durably; do not derive an authoritative deadline only in mobile memory.
  The confirmation operation must be idempotent under duplicate scans and safe under concurrent confirmation, cancellation, expiry cleanup, or session creation attempts.
  Do not expose the service-role key to the browser or mobile app. The operator route must authenticate the operator and prove active-location ownership before mutation.
  Remove or revoke any customer-callable session-start path that would bypass gate confirmation, while preserving internal compatibility only where it cannot grant customer authority.
  Avoid claiming that metered billing is fully implemented if this slice only establishes the durable grace boundary. Make that residual gap explicit.
  Ignore the superseded slot-validation-first history in `workflow/temp/SESSION_UPDATE.md`; use it only as reset context.

- `Required validation`:
  Run `npm --workspace apps/mobile run test`.
  Run `npm --workspace apps/mobile run typecheck`.
  Run `npm --workspace apps/parking-app-operator run test`.
  Run `npm --workspace apps/parking-app-operator run build`.
  Run `git diff --check`.
  Statically verify SQL grants, row locking, location validation, idempotency, invalid-state rejection, audit-event creation, and concurrency guards.
  If no non-production Supabase target is available, state clearly that SQL execution and concurrency rehearsal remain manual follow-ups rather than implying database validation occurred.

- `Success criteria`:
  A customer cannot start a reservation or walk-in parking session merely by tapping a mobile action or calling a customer-granted start RPC.
  A valid operator at the reservation's location can confirm the entry pass once, and duplicate confirmation returns the same authoritative session without duplicate rows or events.
  Wrong-location, expired, cancelled, completed, malformed, and unknown passes fail without changing reservation, slot, or session state.
  The backend records entry confirmation and a server-derived parking-grace deadline, and the mobile app recovers that active session from backend state before routing to the session screen.
  Automated tests cover the new authority and location boundaries, and all required validation passes.

- `Expected deliverable`:
  A focused backend, operator API, and mobile synchronization implementation; migration or compatibility documentation as needed; regression tests; a factual developer execution-log entry; tracker updates that distinguish repo completion from unperformed staging proof; and a clean baton handoff to Reviewer.

- `Files likely involved`:
  `supabase/schema.sql`
  `supabase/start_parking_session.sql`
  a new gate-entry confirmation SQL artifact if that is safer than mutating the legacy RPC in place
  `supabase/README.md`
  `apps/parking-app-operator/app/api/operator/`
  `apps/parking-app-operator/lib/operatorScopedQueries.ts`
  operator route contract tests
  `apps/mobile/src/lib/reservations.ts`
  `apps/mobile/src/features/parking/store/useParkingFlowStore.ts`
  `apps/mobile/src/features/parking/screens/ArrivalScreen.tsx`
  `apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx`
  mobile reservation, walk-in, backend, and recovery contract tests
  `workflow/logs/AI_DEVELOPER_EXECUTION_LOG.md`
  `workflow/planning/ACTIVE_EXECUTION_TRACKER.md`
  `workflow/runtime/AI_WORKFLOW_STATE.md`

- `Reviewer focus areas`:
  Confirm that customer credentials can no longer create a session before gate confirmation.
  Confirm operator authentication and active-location scope are enforced before privileged mutation.
  Review SQL locking, grants, duplicate-scan idempotency, invalid-state behavior, walk-in compatibility, grace timestamp semantics, and audit event uniqueness.
  Verify mobile waiting, refresh, hydration, and recovery behavior does not locally manufacture a session or route prematurely.
  Verify completion claims keep staging execution, concurrency rehearsal, metered-start enforcement, and real-device validation open when unperformed.

- `Next owner after developer closeout`:
  `Reviewer`

