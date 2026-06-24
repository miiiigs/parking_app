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

### 2026-06-24 - Operator Parking Actions Entry Scan

- `Objective`:
  Build the first operator-facing `Parking Actions` workflow so an authenticated, location-assigned operator can scan or manually enter a reservation or walk-in entry QR and call the reviewed `/api/operator/gate-entry` route. The result should give operators a usable entry-confirmation surface without claiming exit confirmation is complete.

- `Why now`:
  The backend gate-entry confirmation SQL and operator route were approved with follow-ups. The strongest repo-executable gap is now connecting that approved backend contract to an operator UI that real staff can use. Track A staging proof, live Supabase execution, and real scanner hardware remain manual dependencies, while this slice can be implemented and validated in repo.

- `In scope`:
  Add a `Parking Actions` navigation item in the operator dashboard for roles with the existing slot/status mutation capability.
  Create an operator `Parking Actions` page with an `Entry Scan` workflow that accepts pasted QR payloads and, if practical with browser support, a camera scan affordance that gracefully falls back to manual entry.
  Call `/api/operator/gate-entry` for entry confirmation and show clear success, idempotent replay, invalid pass, unauthorized-location, wrong-location, expired, cancelled, completed, and generic failure states.
  Add manual entry confirmation affordances from reservation/session detail surfaces where the current data can safely supply or accept an entry-pass payload.
  Include an `Exit Scan` section only as a planned or disabled workflow unless a backend paid-exit authorization contract already exists in the repo. Do not invent an exit mutation.
  Keep the UI operational and restrained: concise operator copy, loading states, retry paths, and no marketing-style filler.
  Add or update focused operator tests for route visibility, capability gating, request behavior, and the exit-scan blocked state.
  Update durable workflow docs and readiness checklists if implementation reality changes.

- `Out of scope`:
  Do not implement paid-exit QR confirmation, payment-provider integration, exit grace mutation, penalty automation, compensation handling, staging SQL deployment, assignment provisioning, or real hardware scanner validation in this cycle.
  Do not loosen operator assignment requirements or service-role boundaries.
  Do not redesign unrelated dashboard pages.

- `Dependencies to respect`:
  The accepted gate-entry route requires exact persisted operator-location assignment before privileged mutation.
  The `Parking Actions` page must use the existing operator auth, location context, capability model, route helpers, and design system patterns.
  Exit confirmation remains blocked until the backend owns paid-exit authorization and leave-the-slot grace.
  Keep the current debugger note visible; do not clear it unless the manual Android launch validation has actually happened.

- `Constraints`:
  Never expose the service-role key to the browser.
  Treat user-entered QR payloads as untrusted input.
  Keep entry confirmation idempotent from the operator perspective, but do not mask terminal-state failures as success.
  Avoid claiming scanner hardware or live Supabase validation if only browser/manual-entry tests were run.
  Preserve the existing monorepo structure and do not recreate root-level Expo files removed during cleanup.

- `Required validation`:
  Run `npm --workspace apps/parking-app-operator run test`.
  Run `npm --workspace apps/parking-app-operator run build`.
  Run `npm --workspace apps/mobile run test` if shared contracts or mobile-facing behavior changed.
  Run `git diff --check`.
  Statically verify the new UI calls only the operator API route and never touches privileged Supabase credentials directly.

- `Success criteria`:
  Operators have a discoverable `Parking Actions` menu.
  Entry confirmation can be initiated from a pasted or scanned entry-pass payload and receives clear operator feedback.
  The UI handles success, idempotent replay, malformed input, authorization failure, wrong-location or terminal-state failure, loading, and retry states.
  Exit scan is visible as a planned flow but cannot falsely complete an exit without a backend contract.
  Tests cover the new operator workflow boundaries.
  Tracker and logs distinguish repo implementation from unperformed staging, assignment provisioning, hardware scan, and exit lifecycle proof.

- `Expected deliverable`:
  A focused operator UI/client implementation for entry scan/manual gate confirmation, blocked exit scan framing, tests, updated docs if needed, a factual developer execution-log entry, tracker updates that preserve manual/staging gaps, and a baton handoff to Reviewer.

- `Files likely involved`:
  `apps/parking-app-operator/components/layout/dashboard-layout.tsx`
  `apps/parking-app-operator/app/dashboard/parking-actions/page.tsx`
  `apps/parking-app-operator/components/dashboard/operation-detail-sheet.tsx`
  `apps/parking-app-operator/app/dashboard/reservations/page.tsx`
  `apps/parking-app-operator/app/api/operator/gate-entry/route.ts`
  `apps/parking-app-operator/lib/operatorRouteSchemas.ts`
  `apps/parking-app-operator/tests/*.mjs`
  `apps/parking-app-operator/tests/*.js`
  `workflow/logs/AI_DEVELOPER_EXECUTION_LOG.md`
  `workflow/planning/ACTIVE_EXECUTION_TRACKER.md`
  `workflow/runtime/AI_WORKFLOW_STATE.md`

- `Reviewer focus areas`:
  Verify the page is capability-gated and location-context aware.
  Verify the browser client calls only `/api/operator/gate-entry`.
  Verify malformed, unauthorized, wrong-location, expired, cancelled, completed, duplicate-active, and generic error states are represented honestly.
  Verify exit scan is not presented as working until the backend contract exists.
  Verify docs and tracker keep staging SQL execution, assignment provisioning, scanner hardware validation, and exit lifecycle work open.

- `Next owner after developer closeout`:
  `Reviewer`
