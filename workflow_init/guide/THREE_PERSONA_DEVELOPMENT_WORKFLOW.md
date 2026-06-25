# Three Persona Development Workflow

This is the clean operating guide for the `workflow_init/` starter package.

## Purpose

This workflow lets three Codex personas collaborate through markdown files:

- `Planner`
- `Developer`
- `Reviewer`

There is also one optional manual support persona:

- `Debugger`

The debugger is connected to the workflow, but it is not part of the automated baton cycle.

## Core Rule

The main project reference is [MASTER_PRODUCTION_PLAN.md](../planning/MASTER_PRODUCTION_PLAN.md).

If a project is new or underdefined, build the master plan first using [MASTER_PRODUCTION_PLAN_INITIALIZER.md](../planning/MASTER_PRODUCTION_PLAN_INITIALIZER.md).

## Source Of Truth Order

For a new project:

1. [MASTER_PRODUCTION_PLAN_INITIALIZER.md](../planning/MASTER_PRODUCTION_PLAN_INITIALIZER.md)
2. [MASTER_PRODUCTION_PLAN.md](../planning/MASTER_PRODUCTION_PLAN.md)
3. [ACTIVE_EXECUTION_TRACKER.md](../planning/ACTIVE_EXECUTION_TRACKER.md)
4. [AI_WORKFLOW_STATE.md](../runtime/AI_WORKFLOW_STATE.md)

For an active cycle:

1. [AI_WORKFLOW_STATE.md](../runtime/AI_WORKFLOW_STATE.md)
2. [MASTER_PRODUCTION_PLAN.md](../planning/MASTER_PRODUCTION_PLAN.md)
3. [ACTIVE_EXECUTION_TRACKER.md](../planning/ACTIVE_EXECUTION_TRACKER.md)
4. [AI_DEVELOPER_PROMPT_NEXT_MOVE.md](../runtime/AI_DEVELOPER_PROMPT_NEXT_MOVE.md)
5. [AI_DEVELOPER_EXECUTION_LOG.md](../logs/AI_DEVELOPER_EXECUTION_LOG.md)
6. [AI_REVIEWER_REMARKS.md](../logs/AI_REVIEWER_REMARKS.md)
7. [PROJECT_DOCUMENT_INDEX.md](../planning/PROJECT_DOCUMENT_INDEX.md)
8. Relevant code, tests, schemas, docs, and runtime output

## Baton Rules

The baton lives in [AI_WORKFLOW_STATE.md](../runtime/AI_WORKFLOW_STATE.md).

Only one automated owner is active at a time:

- `Planner`
- `Developer`
- `Reviewer`

The debugger is manual and does not own the baton.

## Cycle

1. `Planner` reads the plan, tracker, state, logs, review, debugger notes, and suggestions.
2. `Planner` writes a precise brief in [AI_DEVELOPER_PROMPT_NEXT_MOVE.md](../runtime/AI_DEVELOPER_PROMPT_NEXT_MOVE.md).
3. `Planner` hands the baton to `Developer`.
4. `Developer` audits the repo, implements only missing work, validates honestly, logs the result, and hands off to `Reviewer`.
5. `Reviewer` reviews the real changes, records findings, calls out manual actions, and returns the baton to `Developer` for rework or `Planner` for the next cycle.

## Manual Debugger Loop

Use [DEBUGGER_CALL_TEMPLATE.md](../manual/DEBUGGER_CALL_TEMPLATE.md) when an error, failing test, broken build, or confusing behavior needs focused investigation outside the baton cycle.

Debugger output belongs in [DEBUGGER_OUTPUT_LOG.md](../logs/DEBUGGER_OUTPUT_LOG.md).

The reviewer can reset the debugger log when the issue is accepted and no longer active.

## Manual Suggestions Loop

Use [SUGGESTIONS_AND_IMPROVEMENTS_TEMPLATE.md](../manual/SUGGESTIONS_AND_IMPROVEMENTS_TEMPLATE.md) to capture non-bug improvements, small adjustments, or future-cycle ideas.

Suggestions belong in [SUGGESTIONS_AND_IMPROVEMENTS_LOG.md](../logs/SUGGESTIONS_AND_IMPROVEMENTS_LOG.md).

The planner should consider active suggestions when choosing the next cycle.

## Temp Folder

Use [temp](../temp) for cycle-scoped files:

- scratch notes
- session summaries
- temporary audit notes
- draft baselines

The reviewer should decide whether temp files are deleted, retained briefly, or promoted to durable docs.

## Manual Actions

Reviewers should explicitly record external work Codex cannot complete by itself, such as:

- running SQL in a hosted database
- installing dependencies
- validating on a real device
- configuring third-party services
- deploying or rolling back production systems

## Portability

This package is self-contained. To reuse it, copy `workflow_init/` into another project and either:

- keep the folder name and configure automation prompts to read `workflow_init/...`, or
- rename it to `workflow/` and replace `workflow_init/` references in prompts with `workflow/`.
