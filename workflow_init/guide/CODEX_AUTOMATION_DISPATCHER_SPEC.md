# Codex Automation Dispatcher Spec

This file records the clean automation pattern for the three-persona workflow.

## Recommended Automation

Use one heartbeat automation as a baton-aware dispatcher.

The dispatcher:

- reads `workflow_init/runtime/AI_WORKFLOW_STATE.md`
- determines the current owner
- follows only that persona's rules
- updates the baton for the next owner
- exits

The debugger is not part of this automation.

## Suggested Configuration

- `Automation name`:
  `Three Persona Workflow Dispatcher`

- `Automation id`:
  `three-persona-workflow-dispatcher`

- `Kind`:
  `heartbeat`

- `Destination`:
  `thread`

- `Schedule`:
  `FREQ=MINUTELY;INTERVAL=5`

- `Recommended initial status`:
  `PAUSED`

## Prompt Pattern

Use this prompt when creating or updating the Codex automation:

```md
Run the repository workflow as a single baton-aware dispatcher.

Start by reading workflow_init/guide/CODEX_AUTOMATION_DISPATCHER_SPEC.md and workflow_init/runtime/AI_WORKFLOW_STATE.md.

Before doing any role work, check whether the workflow state suggests a contradictory, unresolved, blocked, or already-active run. If the state is contradictory, unresolved, blocked, or effectively locked, make the smallest safe clarification update and stop without advancing the cycle.

Determine the current owner and act only as that persona for this run. Do not do cross-role work.

If the current owner is Planner, follow the planner behavior defined by workflow_init/personas/PLANNER_PERSONA.md:
- read the workflow source-of-truth files
- decide the best next unit of work
- update workflow_init/runtime/AI_DEVELOPER_PROMPT_NEXT_MOVE.md with a precise brief
- update workflow_init/runtime/AI_WORKFLOW_STATE.md so Developer becomes the current owner

If the current owner is Developer, follow the developer behavior defined by workflow_init/personas/DEVELOPER_PERSONA.md:
- compare the brief against the real repo state
- implement only the missing work
- run required validation
- append a factual entry to workflow_init/logs/AI_DEVELOPER_EXECUTION_LOG.md
- update workflow_init/planning/ACTIVE_EXECUTION_TRACKER.md and any durable task docs if project state changed
- update workflow_init/runtime/AI_WORKFLOW_STATE.md so Reviewer becomes the current owner

If the current owner is Reviewer, follow the reviewer behavior defined by workflow_init/personas/REVIEWER_PERSONA.md:
- review the real changes
- record findings in workflow_init/logs/AI_REVIEWER_REMARKS.md
- include manual actions required when external steps are needed
- update workflow_init/runtime/AI_WORKFLOW_STATE.md so the baton returns to Developer for rework or Planner for the next cycle

Update workflow_init/planning/ACTIVE_EXECUTION_TRACKER.md only when the current persona is supposed to change visible state there.

End with a short summary of what role ran, what it changed, any manual actions required, and who owns the next step.
```

## Rebuild Steps

1. Copy `workflow_init/` into the new repository root.
2. Fill or generate `workflow_init/planning/MASTER_PRODUCTION_PLAN.md`.
3. Fill `workflow_init/planning/ACTIVE_EXECUTION_TRACKER.md`.
4. Confirm `workflow_init/runtime/AI_WORKFLOW_STATE.md` starts with `Planner`.
5. Create the heartbeat automation using the prompt above.
6. Keep the automation paused until the first master plan and tracker are ready.
