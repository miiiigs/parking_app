# AI Developer Prompt - Next Move

This file is the planner-issued working brief for the active cycle.

It is not a durable source of truth and it does not outrank the plan, tracker, workflow state, or the repo itself.

Before acting on any prompt written here, read:

1. [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md)
2. [ACTIVE_EXECUTION_TRACKER.md](./ACTIVE_EXECUTION_TRACKER.md)
3. [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md)
4. [AI_DEVELOPER_EXECUTION_LOG.md](./AI_DEVELOPER_EXECUTION_LOG.md)
5. [AI_REVIEWER_REMARKS.md](./AI_REVIEWER_REMARKS.md)
6. [PROJECT_DOCUMENT_INDEX.md](./PROJECT_DOCUMENT_INDEX.md)
7. Any relevant durable project document linked from the project document index

## Current Prompt

### 2026-06-22 - Track A Environment And Release Baseline Rebuild

- `Objective`:
  Rebuild the current environment, migration, rollback, and release-operations baseline from actual repo reality so Track A becomes current again after the outdated operating docs were removed.

- `Why now`:
  The refreshed master production plan makes environment and release discipline the highest planning gap. The active tracker previously overstated Track A as effectively implemented, so we need a current durable baseline before trusting later launch-critical work.

- `In scope`:
  Audit the repo for actual mobile, operator, Supabase, build, and release requirements.
  Create one current durable environment-and-release baseline document inside `workflow/`.
  Update `workflow/ACTIVE_EXECUTION_TRACKER.md` if the real Track A state or evidence changes during the audit.
  Update `workflow/PROJECT_DOCUMENT_INDEX.md` only if the new durable baseline needs to be linked there.
  Append a factual closeout entry to `workflow/AI_DEVELOPER_EXECUTION_LOG.md`.

- `Out of scope`:
  Implementing payment provider integration.
  Building walk-in expiry automation.
  Reworking customer-facing mobile UI.
  Performing the actual staging bootstrap or rollback drill unless a safe paper or script-level rehearsal is possible without external access.

- `Dependencies to respect`:
  Treat `workflow/MASTER_PRODUCTION_PLAN.md` as the planning anchor.
  Treat `workflow/ACTIVE_EXECUTION_TRACKER.md` as the active board that now needs Track A reality re-confirmed.
  Respect current repo reality over older execution-log assumptions when they differ.

- `Constraints`:
  Do not invent environment rules that the repo cannot support.
  Keep the rebuilt baseline grounded in committed files, package scripts, SQL artifacts, and current runtime configuration usage.
  If any external or manual action is required for full closure, leave that clearly documented rather than overstating completion.

- `Required validation`:
  Cross-check runtime env var usage across mobile and operator code.
  Cross-check build or release scripts and SQL artifact ordering from the repo.
  Confirm the rebuilt document is internally consistent with the refreshed master production plan and tracker.

- `Success criteria`:
  A current durable Track A baseline exists in `workflow/` and explains environment tiers, env vars, migration sequencing, rollback posture, release ownership, and remaining manual gaps clearly enough for the reviewer to assess it.

- `Expected deliverable`:
  A new or updated durable environment and release baseline document in `workflow/`, plus aligned updates to the tracker and execution log if warranted by the repo audit.

- `Files likely involved`:
  `workflow/MASTER_PRODUCTION_PLAN.md`
  `workflow/ACTIVE_EXECUTION_TRACKER.md`
  `workflow/PROJECT_DOCUMENT_INDEX.md`
  `workflow/AI_DEVELOPER_EXECUTION_LOG.md`
  `apps/mobile/.env.example`
  `apps/mobile/package.json`
  `apps/parking-app-operator/package.json`
  `supabase/*.sql`

- `Reviewer focus areas`:
  Whether the rebuilt baseline is grounded in real repo evidence.
  Whether any critical environment, migration, rollback, or release risk is still missing.
  Whether manual actions required for full Track A closure are documented explicitly.

- `Next owner after developer closeout`:
  `Reviewer`

When the planner sets the next task, replace this section with:

```md
### YYYY-MM-DD - Brief Title

- `Objective`:
- `Why now`:
- `In scope`:
- `Out of scope`:
- `Dependencies to respect`:
- `Constraints`:
- `Required validation`:
- `Success criteria`:
- `Expected deliverable`:
- `Files likely involved`:
- `Reviewer focus areas`:
- `Next owner after developer closeout`:
```
