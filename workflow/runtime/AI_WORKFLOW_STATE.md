# AI Workflow State

This file is the active baton for the planner, developer, and reviewer workflow.

If you are one of the personas, read this file before doing anything else.

## Current State

- `Cycle ID`:
  `2026-06-25-cycle-007-track-k-dashboard-auth-onboarding`

- `Current owner`:
  `Planner`

- `Current phase`:
  `Planner reprioritization`

- `Status`:
  `Reviewer accepted the Track K dashboard auth-user onboarding slice with follow-ups: Access Control can now invite a new Supabase Auth user or grant or update access for an existing one through the admin-only dashboard-account route, repo validation passed, and the docs or tracker now describe invitation-based onboarding truthfully while keeping live proof and bootstrap-admin work open. The user has now clarified the preferred next Track K repo slice: finalize operator-versus-admin menu visibility, remove the non-admin location switcher, improve admin lot-switcher readability, rename the operator-facing tools menu, and apply the agreed navigation order without duplicating already accepted operator-account provisioning work.`

- `Primary objective`:
  `Choose the next highest-value, dependency-aware unit of work after the accepted Track K dashboard auth-user onboarding slice, with the clarified operator/admin navigation and visibility adjustments treated as the preferred next priority.`

- `Why this owner has the baton`:
  `The current reviewer decision accepted the onboarding slice, no code rework was requested, and the workflow now needs a fresh planner brief for the next cycle.`

- `Required reads for the current owner`:
  1. [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md)
  2. [MASTER_PRODUCTION_PLAN.md](../planning/MASTER_PRODUCTION_PLAN.md)
  3. [ACTIVE_EXECUTION_TRACKER.md](../planning/ACTIVE_EXECUTION_TRACKER.md)
  4. [AI_DEVELOPER_EXECUTION_LOG.md](../logs/AI_DEVELOPER_EXECUTION_LOG.md)
  5. [AI_REVIEWER_REMARKS.md](../logs/AI_REVIEWER_REMARKS.md)
  6. [PROJECT_DOCUMENT_INDEX.md](../planning/PROJECT_DOCUMENT_INDEX.md)
  7. [DEBUGGER_OUTPUT_LOG.md](../logs/DEBUGGER_OUTPUT_LOG.md)
  8. [SUGGESTIONS_AND_IMPROVEMENTS_LOG.md](../logs/SUGGESTIONS_AND_IMPROVEMENTS_LOG.md)
  9. [SESSION_UPDATE.md](../temp/SESSION_UPDATE.md)
  10. Any durable Track K, Track A, or Track D documents relevant to the next safe cycle

- `Expected output from current owner`:
  `A precise next developer brief grounded in the accepted repo state, explicit reasoning about why that task is next now, any needed tracker or plan adjustments, and a baton handoff to Developer.`

- `Exit criteria for this phase`:
  - planner reads the accepted reviewer decision and current tracker reality before assigning new work
  - planner chooses one dependency-aware next move that does not reopen already accepted scope without cause
  - planner decides whether the next cycle should target Track K staging proof, broader Track K repo work, or another higher-priority tracked dependency
  - planner updates `AI_DEVELOPER_PROMPT_NEXT_MOVE.md` with a concrete brief and updates this baton so the next owner is unambiguous

- `Next owner after successful handoff`:
  `Developer`

- `Blocking dependencies`:
  `The accepted onboarding slice still needs live Supabase invitation delivery proof, first-login completion, dashboard-role and lot-management staging rehearsal, production-safe bootstrap-admin replacement, scanner hardware validation, and exit-contract work, but none of those block planner reprioritization.`

- `Last updated`:
  `2026-06-25`

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
