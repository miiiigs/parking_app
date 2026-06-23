# AI Workflow State

This file is the active baton for the planner, developer, and reviewer workflow.

If you are one of the personas, read this file before doing anything else.

## Current State

- `Cycle ID`:
  `2026-06-23-cycle-002-gate-entry-confirmation`

- `Current owner`:
  `Reviewer`

- `Current phase`:
  `Reviewer assessment`

- `Status`:
  `Developer completed the requested rework. Gate confirmation now requires an exact persisted operator-location assignment before service-role mutation, and SQL idempotent replay is restricted to confirmed reservations with active sessions. Reviewer should verify both fixes and their regression coverage.`

- `Primary objective`:
  `Re-review the gate-entry authorization and terminal replay corrections, confirm they close the recorded findings without regression, and decide whether the cycle can return to Planner.`

- `Why this owner has the baton`:
  `Developer implemented the narrowly scoped reviewer rework, passed the required validation, documented the new manual assignment-provisioning step, and returned the same cycle for independent review.`

- `Required reads for the current owner`:
  1. [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md)
  2. [AI_DEVELOPER_PROMPT_NEXT_MOVE.md](./AI_DEVELOPER_PROMPT_NEXT_MOVE.md)
  3. [MASTER_PRODUCTION_PLAN.md](../planning/MASTER_PRODUCTION_PLAN.md)
  4. [ACTIVE_EXECUTION_TRACKER.md](../planning/ACTIVE_EXECUTION_TRACKER.md)
  5. [TRACK_A_ENVIRONMENT_RELEASE_BASELINE.md](../planning/TRACK_A_ENVIRONMENT_RELEASE_BASELINE.md)
  6. [AI_DEVELOPER_EXECUTION_LOG.md](../logs/AI_DEVELOPER_EXECUTION_LOG.md)
  7. [AI_REVIEWER_REMARKS.md](../logs/AI_REVIEWER_REMARKS.md)
  8. [PROJECT_DOCUMENT_INDEX.md](../planning/PROJECT_DOCUMENT_INDEX.md)
  9. [confirm_parking_entry.sql](../../supabase/confirm_parking_entry.sql)

- `Expected output from current owner`:
  `A findings-first re-review in AI_REVIEWER_REMARKS.md, explicit disposition of the retained temp update, and a baton handoff to Developer for further rework or Planner if accepted.`

- `Exit criteria for this phase`:
  - reviewer verifies exact persisted assignment is required before privileged RPC invocation
  - reviewer verifies missing and cross-location assignments fail closed
  - reviewer verifies only confirmed-reservation and active-session duplicates replay successfully
  - reviewer verifies terminal combinations fail and focused tests cover both findings
  - reviewer confirms assignment provisioning and live staging rehearsal remain explicit manual actions
  - reviewer records a decision and assigns the next owner

- `Next owner after successful handoff`:
  `Planner`

- `Blocking dependencies`:
  `No external blocker for repo rework. A non-production Supabase target and credentials remain required after approval for live authorization, terminal-state, duplicate, and concurrency validation.`

- `Last updated`:
  `2026-06-23`

## Update Rules

Whenever the baton changes hands, update:

- `Cycle ID` if this is a new work cycle
- `Current owner`
- `Current phase`
- `Status`
- `Primary objective`
- `Why this owner has the baton`
- `Required reads for the current owner`
- `Expected output from current owner`
- `Exit criteria for this phase`
- `Next owner after successful handoff`
- `Blocking dependencies`
- `Last updated`

## Allowed Owner Values

- `Planner`
- `Developer`
- `Reviewer`

## Allowed Phase Values

- `Planner intake`
- `Planner briefing`
- `Developer repo audit`
- `Developer implementation`
- `Developer validation`
- `Reviewer assessment`
- `Reviewer rework request`
- `Planner reprioritization`
- `Blocked`
- `Done`

