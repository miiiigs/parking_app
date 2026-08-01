# Codex Automation Dispatcher Spec

This file records the exact Codex automation pattern used for the three-persona workflow in this thread.

Use it as the durable source for rebuilding the automation in another thread or another project after copying the `workflow/` folder.

The manual `Debugger` persona is intentionally outside this automation.

## Why A Dispatcher Was Used

Codex thread automations have an important limitation:

- only one heartbeat automation can be attached to a thread at a time

Because of that, a single baton-aware dispatcher automation is the safest thread-based implementation.

The dispatcher:

- wakes on a schedule
- reads `workflow/runtime/AI_WORKFLOW_STATE.md`
- determines the current owner
- performs only that persona's responsibilities
- updates the baton for the next persona
- exits

The dispatcher does not run the debugger persona because the debugger is a manual support path for error investigation, not a baton owner.

The workflow also expects personas to respect the `workflow/temp/` contract:

- `Developer` puts cycle-scoped helper docs there by default
- `Reviewer` decides whether those temp files should be deleted, retained briefly, or promoted later
- `Planner` checks that folder before building new work on top of prior-cycle leftovers

## Current Automation Configuration

- `Automation name`:
  `Parking App Workflow Dispatcher`

- `Automation id`:
  `planner-persona-cycle` (legacy id retained from the first setup)

- `Kind`:
  `heartbeat`

- `Destination`:
  `thread`

- `Schedule`:
  `FREQ=MINUTELY;INTERVAL=2`

- `Status when configured`:
  `PAUSED`

## What The Heartbeat Interval Means

The heartbeat interval controls automatic wake-ups on a fixed schedule.

In this workflow, the current schedule is:

- `FREQ=MINUTELY;INTERVAL=2`

That means the dispatcher is eligible to wake up automatically on the clock pattern implied by the schedule.

Example:

- `10:00 -> 10:02 -> 10:04 -> 10:06`

not:

- `10:00 starts -> finishes at 10:07 -> next starts at 10:27`

Treat this as schedule-based cadence, not "wait N minutes after the previous run finishes."

The interval is therefore:

- useful as the background continuation cadence
- not the source of truth for role sequencing

The source of truth for sequencing is still:

- `workflow/runtime/AI_WORKFLOW_STATE.md`

## Manual Runs Between Heartbeats

You can also run the dispatcher manually between heartbeat intervals.

Practical meaning:

- if `Planner` finishes and hands the baton to `Developer`, you do not have to wait for the next automatic wake-up
- you can manually trigger the automation again
- the dispatcher will read the baton and run only the next owner

So the heartbeat interval should be treated as:

- the automatic fallback cadence

not as:

- a lockout that prevents immediate manual continuation

## Interval Reset Note

The official Codex automation docs confirm that thread automations are heartbeat-style recurring wake-ups attached to a thread and that automations run on a schedule or fixed cadence.

Use this operating assumption:

- a manual run should be treated as an extra immediate execution
- the configured heartbeat interval should still be treated as the background automatic cadence unless observed otherwise in the app

One caveat remains:

- the public docs do not clearly state what happens if a previous run is still active when the next scheduled interval arrives

For safety, assume the cadence is fixed and design the automation to avoid collisions.

If exact next-fire timing matters operationally, verify it once in the app after a manual run and treat that observed app behavior as the environment-specific truth.

## Collision-Avoidance Rule

Because the scheduler should be treated as fixed-cadence, the dispatcher prompt should always avoid overlapping work.

Best-practice rule:

- before doing role work, check whether the workflow already indicates an active unresolved run or whether a repo-level lock mechanism exists
- if a lock or active-run marker exists, stop without advancing the cycle

This repository currently uses the baton file as the primary coordination mechanism, and the dispatcher prompt should avoid forcing progress when the state looks contradictory or unresolved.

## Exact Prompt Pattern

The active Codex automation was configured with this operating prompt:

```md
Run the repository workflow as a single baton-aware dispatcher.

Start by reading workflow/guide/CODEX_AUTOMATION_DISPATCHER_SPEC.md and workflow/runtime/AI_WORKFLOW_STATE.md.

Before doing any role work, check whether the workflow state suggests a contradictory or already-active unresolved run. If the state is contradictory, unresolved, or effectively locked, make the smallest safe clarification update and stop without advancing the cycle.

Determine the current owner and act only as that persona for this run. Do not do cross-role work.

If the current owner is Planner, follow the planner behavior defined by workflow/personas/PLANNER_PERSONA.md:
- read the workflow source-of-truth files
- decide the best next unit of work
- update workflow/runtime/AI_DEVELOPER_PROMPT_NEXT_MOVE.md with a precise brief
- update workflow/runtime/AI_WORKFLOW_STATE.md so Developer becomes the current owner

If the current owner is Developer, follow the developer behavior defined by workflow/personas/DEVELOPER_PERSONA.md:
- compare the brief against the real repo state
- implement only the missing work
- run required validation
- append a factual entry to workflow/logs/AI_DEVELOPER_EXECUTION_LOG.md
- update workflow/planning/ACTIVE_EXECUTION_TRACKER.md and any durable task docs if the project state changed
- update workflow/runtime/AI_WORKFLOW_STATE.md so Reviewer becomes the current owner

If the current owner is Reviewer, follow the reviewer behavior defined by workflow/personas/REVIEWER_PERSONA.md:
- review the real changes
- record findings in workflow/logs/AI_REVIEWER_REMARKS.md
- include manual actions required when external steps are needed
- update workflow/runtime/AI_WORKFLOW_STATE.md so the baton returns to Developer for rework or Planner for the next cycle

Update workflow/planning/ACTIVE_EXECUTION_TRACKER.md only when the current persona is supposed to change visible state there.

End with a short summary of what role ran, what it changed, any manual actions required, and who owns the next step.

If the baton state is missing, contradictory, or blocked, make the smallest safe documentation update needed to clarify the state and stop without forcing the cycle forward.
```

## Rebuild Steps In Codex

If you want to recreate this automation in another thread:

1. Copy the `workflow/` folder into the new project root.
2. Rewrite `workflow/planning/MASTER_PRODUCTION_PLAN.md`, `workflow/planning/ACTIVE_EXECUTION_TRACKER.md`, and `workflow/planning/PROJECT_DOCUMENT_INDEX.md` for the new project.
3. Ensure `workflow/runtime/AI_WORKFLOW_STATE.md` starts with `Planner` as the current owner unless you intentionally want a different starting owner.
4. Create one heartbeat automation attached to the target thread.
5. Use the name, schedule, and prompt pattern recorded in this file.
6. Start it in `PAUSED` status first.
7. Review the baton state and the prompt files.
8. Activate it only after confirming the folder and project references are correct.

## Recommended Operating Style For This Project

For this repository, the most practical usage pattern is:

1. Keep the dispatcher automation configured with a heartbeat interval for unattended continuation.
2. Manually click run whenever you want the next persona to continue immediately.
3. Let the heartbeat act as backup continuation when you do not manually advance the cycle.
4. Treat the cadence as clock-based scheduling, not finish-based delay.

## When To Use A Different Automation Model

Use detached workspace cron automations instead of a thread heartbeat when:

- you need fully separate recurring jobs per persona
- you want separate schedules for planner, developer, and reviewer
- you want the jobs to run outside a single conversational thread

For this thread, the dispatcher was the correct model because the goal was a shared baton inside one ongoing Codex conversation.
