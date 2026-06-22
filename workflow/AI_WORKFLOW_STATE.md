# AI Workflow State

This file is the active baton for the planner, developer, and reviewer workflow.

If you are one of the personas, read this file before doing anything else.

## Current State

- `Cycle ID`:
  `2026-06-22-cycle-001-track-a-baseline`

- `Current owner`:
  `Planner`

- `Current phase`:
  `Planner reprioritization`

- `Status`:
  `Reviewer approved the Track A baseline rebuild with follow-ups. Planner should choose the next unit of work with the rebuilt baseline accepted and the external rehearsal tasks still open.`

- `Primary objective`:
  `Choose the next planning move after the accepted Track A baseline rebuild, while accounting for the still-open staging bootstrap, rollback drill, and manual provisioning tasks.`

- `Why this owner has the baton`:
  `The reviewer accepted the Track A documentation cycle, recorded the residual manual actions, and returned the baton for the next planning decision.`

- `Required reads for the current owner`:
  1. [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md)
  2. [ACTIVE_EXECUTION_TRACKER.md](./ACTIVE_EXECUTION_TRACKER.md)
  3. [TRACK_A_ENVIRONMENT_RELEASE_BASELINE.md](./TRACK_A_ENVIRONMENT_RELEASE_BASELINE.md)
  4. [AI_REVIEWER_REMARKS.md](./AI_REVIEWER_REMARKS.md)
  5. [AI_DEVELOPER_EXECUTION_LOG.md](./AI_DEVELOPER_EXECUTION_LOG.md)
  6. [PROJECT_DOCUMENT_INDEX.md](./PROJECT_DOCUMENT_INDEX.md)

- `Expected output from current owner`:
  `A precise next brief that respects the approved Track A baseline, the active tracker, and the residual manual or external follow-ups.`

- `Exit criteria for this phase`:
  - the planner selects the best next unit of work from the active board
  - the next brief is precise and grounded in current repo and review state
  - manual external tasks are not silently mistaken for completed engineering work
  - next owner is changed to `Developer`

- `Next owner after successful handoff`:
  `Developer`

- `Blocking dependencies`:
  `No workflow blocker. Track A external rehearsal and secret provisioning remain open follow-ups, but planning can continue now that the documentation rebuild is accepted.`

- `Last updated`:
  `2026-06-22`

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
