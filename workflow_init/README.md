# Workflow Init Folder Map

This folder is a clean starter package for the Planner -> Developer -> Reviewer Codex workflow.

It is intentionally reset:

- no project-specific history
- no active debugger work
- no active suggestions
- no developer execution history
- no reviewer findings
- baton starts with `Planner`

## How To Use In Another Project

1. Place this `workflow_init/` folder in the repository root.
2. Start by filling [planning/MASTER_PRODUCTION_PLAN.md](./planning/MASTER_PRODUCTION_PLAN.md), or use [planning/MASTER_PRODUCTION_PLAN_INITIALIZER.md](./planning/MASTER_PRODUCTION_PLAN_INITIALIZER.md) to generate it from a rough project prompt.
3. Fill [planning/ACTIVE_EXECUTION_TRACKER.md](./planning/ACTIVE_EXECUTION_TRACKER.md) from the master plan.
4. Keep [runtime/AI_WORKFLOW_STATE.md](./runtime/AI_WORKFLOW_STATE.md) owned by `Planner` until the first brief is written.
5. Create or update the Codex automation using [guide/CODEX_AUTOMATION_DISPATCHER_SPEC.md](./guide/CODEX_AUTOMATION_DISPATCHER_SPEC.md).

## Folders

- [guide](./guide)
  Workflow rules, operating guide, and automation dispatcher spec.

- [planning](./planning)
  Master plan, active tracker, and project document index.

- [runtime](./runtime)
  Live baton state and current developer brief.

- [logs](./logs)
  Developer history, reviewer outcomes, debugger log, and suggestion log.

- [manual](./manual)
  Manual debugger and suggestion capture templates.

- [personas](./personas)
  Reusable persona contracts and prompts.

- [temp](./temp)
  Temporary session notes and cycle-scoped artifacts.
