# Three Persona Development Workflow

This document is the complete operating guide for the `workflow/` folder.

It explains:

- what the workflow is
- why the files are structured this way
- what each persona does
- how the baton moves
- how rework and manual actions are handled
- how the workflow is made portable to other projects
- how the Codex automation was built for this repository

## Foundational Rule

The main and initial planning reference for a project is [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md).

If a project is new, underdefined, or missing trustworthy planning docs, the workflow should start by building the master production plan first.

Use [MASTER_PRODUCTION_PLAN_INITIALIZER.md](./MASTER_PRODUCTION_PLAN_INITIALIZER.md) to do that, even if the only available input is a prompt or rough project description.

## Purpose

This workflow is designed for three Codex personas that collaborate through markdown files:

- `Planner`
- `Developer`
- `Reviewer`

The system is intentionally file-driven instead of memory-driven.

That means the durable state of the workflow lives in markdown files, not in a single chat session and not in a person's memory. A new thread, a new automation run, or a different Codex session should still be able to reconstruct the current state by reading the workflow folder.

## Design Principles

This workflow is built around a few non-negotiable principles:

- one active owner at a time
- durable written handoffs
- repo-first truth instead of assumption-first execution
- explicit validation requirements
- explicit review outcomes
- explicit manual actions when Codex cannot finish a step alone
- minimal dependence on chat history

## Folder Contract

The `workflow/` folder is the home of the workflow system itself.

If you copy this folder to another project, the process should still work because all workflow-critical files live here.

The workflow package consists of:

- [THREE_PERSONA_DEVELOPMENT_WORKFLOW.md](./THREE_PERSONA_DEVELOPMENT_WORKFLOW.md)
  This full operating guide.

- [MASTER_PRODUCTION_PLAN_INITIALIZER.md](./MASTER_PRODUCTION_PLAN_INITIALIZER.md)
  The initializer used to create or rebuild the master production plan from prompts, repo scans, or partial context.

- [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md)
  The main planning anchor and strategic roadmap for the current project.

- [ACTIVE_EXECUTION_TRACKER.md](./ACTIVE_EXECUTION_TRACKER.md)
  The active board for what is next, what is blocked, and what changed.

- [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md)
  The baton file that tells every persona who owns the current cycle.

- [AI_DEVELOPER_PROMPT_NEXT_MOVE.md](./AI_DEVELOPER_PROMPT_NEXT_MOVE.md)
  The planner-authored brief for the current cycle.

- [AI_DEVELOPER_EXECUTION_LOG.md](./AI_DEVELOPER_EXECUTION_LOG.md)
  The factual execution history.

- [AI_REVIEWER_REMARKS.md](./AI_REVIEWER_REMARKS.md)
  The reviewer decision record.

- [PROJECT_DOCUMENT_INDEX.md](./PROJECT_DOCUMENT_INDEX.md)
  The bridge from the workflow package to project-specific documents elsewhere in the repo.

- [CODEX_AUTOMATION_DISPATCHER_SPEC.md](./CODEX_AUTOMATION_DISPATCHER_SPEC.md)
  The durable specification for the Codex automation setup used here.

- [temp/README.md](./temp/README.md)
  The contract for temporary cycle-scoped workflow artifacts that should not clutter the main workflow root.

- [personas/PLANNER_PERSONA.md](./personas/PLANNER_PERSONA.md)
  Reusable planner persona rules and prompt.

- [personas/DEVELOPER_PERSONA.md](./personas/DEVELOPER_PERSONA.md)
  Reusable developer persona rules and prompt.

- [personas/REVIEWER_PERSONA.md](./personas/REVIEWER_PERSONA.md)
  Reusable reviewer persona rules and prompt.

## What Lives Outside The Folder

Project-specific engineering documents may still live outside `workflow/`.

Examples:

- environment playbooks
- architectural decisions
- rollout checklists
- app-specific release guides
- implementation code and tests

That is acceptable because those files are project artifacts, not workflow engine files.

The rule is:

- workflow-critical files must live in `workflow/`
- project-specific references outside `workflow/` must be discoverable through [PROJECT_DOCUMENT_INDEX.md](./PROJECT_DOCUMENT_INDEX.md)

That is what makes this package portable.

## Temp Artifact Rule

Not every workflow document deserves to live permanently at the top level of `workflow/`.

Use `workflow/temp/` for cycle-scoped artifacts such as:

- temporary audit notes
- draft baselines
- one-cycle summaries
- comparison files
- documents that may be deleted after review

Use the main `workflow/` root only for durable files that should remain part of the reusable workflow or project source of truth.

Practical rule:

- if a document is probably useful only for the current cycle, create it in `workflow/temp/`
- if review proves that the document is now a standing reference for future cycles, promote it to durable status outside `workflow/temp/`

### Temp Folder Ownership

- `Developer` can create temp artifacts when the planner brief or the repo audit makes them useful.
- `Reviewer` should decide whether those temp artifacts are deleted, retained for one more cycle, or promoted into durable docs.
- `Planner` should check `workflow/temp/` before assigning follow-up work so stale temporary files do not quietly become false sources of truth.

### Important Distinction

A durable baseline such as a long-lived environment playbook, operating contract, or accepted standing reference should usually live in the main `workflow/` folder after review.

The temp folder is for artifacts that are provisional, disposable, or still awaiting a keep-or-delete decision.

For initial project planning, outside files are optional, not required. The master plan can be created from prompts alone by using [MASTER_PRODUCTION_PLAN_INITIALIZER.md](./MASTER_PRODUCTION_PLAN_INITIALIZER.md).

## Source Of Truth Order

There are two useful reading orders in this workflow.

### Order A: Project initialization

Use this when starting a brand-new project or rebuilding planning from weak context:

1. [MASTER_PRODUCTION_PLAN_INITIALIZER.md](./MASTER_PRODUCTION_PLAN_INITIALIZER.md)
2. [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md)
3. [ACTIVE_EXECUTION_TRACKER.md](./ACTIVE_EXECUTION_TRACKER.md) after the master plan is created

This is the bootstrap order.

It exists because the master production plan is the first real planning anchor.

### Order B: Active cycle execution

Use this when the project already has a working workflow and a current baton state:

1. [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md)
   Read this first to determine who owns the baton.

2. [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md)
   Read this to understand strategic direction and launch logic.

3. [ACTIVE_EXECUTION_TRACKER.md](./ACTIVE_EXECUTION_TRACKER.md)
   Read this to understand current status, dependencies, and the active queue.

4. [AI_DEVELOPER_PROMPT_NEXT_MOVE.md](./AI_DEVELOPER_PROMPT_NEXT_MOVE.md)
   Read this if the planner has already written the current cycle brief.

5. [AI_DEVELOPER_EXECUTION_LOG.md](./AI_DEVELOPER_EXECUTION_LOG.md)
   Read this to understand what has actually been completed and validated.

6. [AI_REVIEWER_REMARKS.md](./AI_REVIEWER_REMARKS.md)
   Read this to understand the latest review result and any rework or manual action requirements.

7. [PROJECT_DOCUMENT_INDEX.md](./PROJECT_DOCUMENT_INDEX.md)
   Use this only when supplemental project documents outside the workflow folder are helpful.

8. Relevant code, tests, SQL, and external durable project docs
   The implementation itself remains the final technical truth.

## Roles

### Planner

The planner owns:

- prioritization
- task selection
- scope control
- dependency order
- success criteria
- writing the developer brief
- deciding how review outcomes affect the roadmap

The planner is not supposed to implement code in normal operation.

### Developer

The developer owns:

- repo inspection
- implementation
- test and validation execution
- updating durable technical docs when reality changed
- writing factual proof-of-work

The developer is not supposed to self-approve launch-critical work without review and validation evidence.

### Reviewer

The reviewer owns:

- independent scrutiny
- bug and regression detection
- validation audit
- approval or rejection decisions
- surfacing manual actions that Codex cannot complete directly

The reviewer is not supposed to silently fix code in reviewer mode. Review and execution remain separate.

## The Baton

The baton is the workflow state recorded in [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md).

Only one persona owns the baton at a time.

Allowed `Current owner` values are:

- `Planner`
- `Developer`
- `Reviewer`

Allowed `Current phase` values are:

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

The baton file is what keeps the workflow stable across:

- new chat threads
- new automation runs
- interrupted sessions
- different operators or teammates

## Full Cycle In Detail

### Stage 1: Planner intake

The planner starts by reading the plan, tracker, baton, execution log, reviewer remarks, and relevant project documents.

The planner then decides:

- what should happen next
- why it is next
- what must not be changed yet
- what validation is required
- what a successful developer cycle should leave behind

The planner writes the current brief to [AI_DEVELOPER_PROMPT_NEXT_MOVE.md](./AI_DEVELOPER_PROMPT_NEXT_MOVE.md).

The planner then updates [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md) so `Developer` becomes the current owner.

Planner exit condition:

- the brief is specific enough to execute without guesswork

### Stage 2: Developer repo audit

The developer begins by reading the baton and confirming the baton is actually owned by `Developer`.

Then the developer compares:

- the planner brief
- the tracker
- the execution log
- the real repo state

The developer must determine:

- what is already done
- what is partially done
- what is missing
- what is blocked
- whether the brief still matches reality

This stage exists so the developer does not blindly re-do work.

Developer repo-audit exit condition:

- the developer knows exactly what is still needed

### Stage 3: Developer implementation

The developer changes only what is necessary.

Normal developer outputs may include:

- code changes
- SQL changes
- tests
- doc updates
- updated durable project notes

The developer should update project-facing docs only when implementation reality changed.

### Stage 4: Developer validation

The developer validates the work using the correct method for the success gate.

Examples:

- unit tests
- integration tests
- typecheck
- build
- manual flow validation
- document cross-check
- environment verification

The developer must not claim validation that did not happen.

After validation, the developer appends a factual entry to [AI_DEVELOPER_EXECUTION_LOG.md](./AI_DEVELOPER_EXECUTION_LOG.md).

Then the developer updates [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md) so `Reviewer` becomes the current owner.

Developer exit condition:

- implementation exists
- validation evidence exists
- the execution log states what is complete and what remains open

### Stage 5: Reviewer assessment

The reviewer begins by reading the baton and confirming the baton is owned by `Reviewer`.

Then the reviewer reads:

- the planner brief
- the developer execution log
- the active tracker
- the changed artifacts
- the validation evidence
- relevant project documents

The reviewer asks:

- is the implementation correct
- are there regressions
- is the validation sufficient
- is the status claim honest
- are manual outside-Codex steps still required

The reviewer writes the result to [AI_REVIEWER_REMARKS.md](./AI_REVIEWER_REMARKS.md).

The reviewer also decides whether the baton returns to:

- `Developer` for rework, or
- `Planner` for the next cycle or roadmap adjustment

Reviewer exit condition:

- the decision is explicit
- the next owner is explicit
- manual follow-ups are explicit when needed

### Stage 6: Planner closeout or requeue

After review, the planner absorbs the outcome and decides what happens next.

Possible results:

- accept the cycle and issue the next task
- queue rework
- adjust priority
- declare a dependency blocker
- update the plan or tracker to reflect new reality

This returns the system to another planner cycle.

## Reviewer Decisions

The review decision must be one of:

- `Approved`
- `Approved with follow-ups`
- `Changes requested`
- `Blocked by dependency`

Meaning:

- `Approved`: good enough for the current gate
- `Approved with follow-ups`: acceptable now, but queue more work later
- `Changes requested`: the developer must fix issues before the planner advances
- `Blocked by dependency`: the workflow cannot continue cleanly until an upstream condition changes

## Manual Actions

Some steps cannot be safely completed by Codex and must be called out by the reviewer.

Common examples:

- running SQL manually in Supabase
- installing or upgrading dependencies
- resetting mobile or web build outputs
- clicking through external dashboards or consoles
- store submission steps
- device-only validation
- production credential work

These must be recorded in [AI_REVIEWER_REMARKS.md](./AI_REVIEWER_REMARKS.md) under:

- `Manual actions required`

The reviewer should state:

- what action is needed
- why it is needed
- who should do it when known
- what should happen after it is done
- whether the baton should return to `Developer` or `Planner`

## Rework Loop

If the reviewer chooses `Changes requested`:

1. The reviewer records the findings.
2. The reviewer sets the next owner to `Developer`.
3. The developer reads the reviewer remarks first.
4. The developer implements only the necessary rework.
5. The developer appends a new execution-log entry rather than silently rewriting history.
6. The reviewer assesses the updated cycle again.

This keeps history honest and makes partial progress visible.

## Manual-Action Loop

If the reviewer identifies manual actions:

1. The reviewer records the exact manual step.
2. The reviewer states whether the workflow should pause for the user or operator.
3. The reviewer states who should own the next step after the manual action.
4. The planner or developer resumes only after that step is acknowledged or completed.

This prevents hidden real-world dependencies from being mistaken for finished work.

## Blocked Loop

If the cycle is blocked by dependency:

1. The reviewer or planner records the dependency clearly.
2. [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md) should reflect the blocked state.
3. The planner decides whether to wait, re-scope, or choose another safe task.

Blocked work should not be mislabeled as done.

## Handoff Rules

- The planner must not hand off vague tasks when constraints and success criteria are known.
- The developer must check the repo before assuming the task is fully undone.
- The developer must not claim validation that did not happen.
- The reviewer must not quietly become the implementer.
- If docs and code disagree, implementation truth wins first, then the docs should be repaired.
- If review findings exist, they should be written explicitly instead of implied in chat.

## Why This Workflow Stays Smooth

This workflow stays fluid because:

- ownership is explicit
- the current state is written down
- the next action is written down
- each persona has a narrow responsibility
- project documents are indexed through the folder
- manual outside-Codex work is visible instead of hidden

## Porting This Workflow To Another Project

To reuse this workflow in another project:

1. Copy the entire `workflow/` folder into the new repository root.
2. Use [MASTER_PRODUCTION_PLAN_INITIALIZER.md](./MASTER_PRODUCTION_PLAN_INITIALIZER.md) to create or rebuild [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md) for the new project.
3. Rewrite [ACTIVE_EXECUTION_TRACKER.md](./ACTIVE_EXECUTION_TRACKER.md) only after the master plan exists.
4. Rewrite [PROJECT_DOCUMENT_INDEX.md](./PROJECT_DOCUMENT_INDEX.md) only if the new project has supplemental durable docs outside the workflow folder.
5. Reset [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md) so the starting owner is correct, usually `Planner`.
6. Clear or reset [AI_DEVELOPER_PROMPT_NEXT_MOVE.md](./AI_DEVELOPER_PROMPT_NEXT_MOVE.md), [AI_DEVELOPER_EXECUTION_LOG.md](./AI_DEVELOPER_EXECUTION_LOG.md), and [AI_REVIEWER_REMARKS.md](./AI_REVIEWER_REMARKS.md) if you want a clean start.
7. Keep the persona files and automation spec largely unchanged.
8. Review the Codex automation config and recreate it for the new thread or workspace.

The persona behavior is reusable.

The master plan is the first project-specific file to build.

The tracker, project-document index, and execution history come after that.

## Codex Automation Model Used Here

This repository uses a Codex thread automation model, documented in [CODEX_AUTOMATION_DISPATCHER_SPEC.md](./CODEX_AUTOMATION_DISPATCHER_SPEC.md).

### Important Codex Constraint

Only one heartbeat automation can be attached to a single thread at a time.

Because of that, three separate thread heartbeats were not the right implementation here.

### Chosen Automation Design

The chosen model is a single baton-aware dispatcher automation.

The dispatcher:

- wakes on a fixed schedule
- reads the baton file
- figures out which persona currently owns the cycle
- follows that persona's rules and prompt file
- updates the baton for the next owner
- exits

### Why This Was Chosen

This model preserves:

- one shared thread
- one shared baton
- one shared execution history
- clean handoffs without overlapping automation runs

### How The Automation Was Built In Codex

The automation was built in Codex in two steps:

1. An initial heartbeat automation was created for the planner role.
2. After Codex surfaced the one-heartbeat-per-thread limitation, that automation was updated into a dispatcher that serves all three personas by reading the baton.

### Current Configuration

The current dispatcher configuration is:

- `Name`: `Three Persona Workflow Dispatcher`
- `Automation id`: `planner-persona-cycle`
- `Kind`: `heartbeat`
- `Destination`: `thread`
- `Schedule`: `FREQ=MINUTELY;INTERVAL=20`
- `Status when configured`: `PAUSED`

### Current Dispatcher Behavior

On each wake-up:

1. Read [CODEX_AUTOMATION_DISPATCHER_SPEC.md](./CODEX_AUTOMATION_DISPATCHER_SPEC.md).
2. Read [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md).
3. Determine whether the current owner is `Planner`, `Developer`, or `Reviewer`.
4. Read the matching persona file under [personas](./personas/PLANNER_PERSONA.md).
5. Perform only that role's responsibilities.
6. Update the baton and any allowed workflow files.
7. Stop.

If the baton is missing, contradictory, or blocked, the dispatcher should make the smallest safe documentation clarification and stop without forcing the cycle forward.

### Manual Advancement Between Heartbeats

You do not need to wait for the next automatic heartbeat if you want the workflow to continue immediately.

You can manually trigger the dispatcher again, and it will:

- read [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md)
- detect the next baton owner
- run only that persona

So in practical use:

- the baton controls persona order
- the heartbeat interval controls unattended background cadence
- manual runs can be used to speed up the cycle between scheduled wake-ups

The Codex manual supports treating automations as schedule-based recurring wake-ups, so the safest assumption is:

- manual runs are immediate extra executions
- the heartbeat interval remains the fallback automatic cadence unless your observed app behavior shows otherwise

In other words:

- fixed clock cadence, not finish-based delay

Example:

- `10:00 -> 10:20 -> 10:40`

not:

- `10:00 starts -> finishes at 10:07 -> next scheduled run becomes 10:27`

### Collision Safety

Because schedule cadence should be treated as fixed, design the automation so it does not assume the previous run has always finished before the next scheduled wake-up.

The safe rule is:

- if the workflow state is contradictory, unresolved, or effectively acting like a lock, the dispatcher should stop rather than forcing the cycle forward

This is why the dispatcher prompt already includes the rule to make the smallest safe clarification update and stop when the baton state is missing, contradictory, or blocked.

### Exact Prompt And Rebuild Instructions

The durable prompt pattern and rebuild steps are stored in [CODEX_AUTOMATION_DISPATCHER_SPEC.md](./CODEX_AUTOMATION_DISPATCHER_SPEC.md).

That file should be treated as the source for recreating the automation in another thread or another project.

## Recommended Operating Pattern

Use the workflow like this:

1. Planner writes the current brief.
2. Developer audits the repo, implements the missing work, validates it, and logs it.
3. Reviewer checks the result, records findings, and calls out manual actions when necessary.
4. Planner absorbs the review result and chooses the next cycle.

If the automation is active, the same pattern still applies. The automation simply performs whichever role currently owns the baton.

## Summary

This workflow works because it separates:

- strategy
- active execution
- current baton state
- implementation history
- review decisions
- reusable persona behavior
- automation configuration

That separation is what makes the system durable, reviewable, automatable, and portable across projects.
