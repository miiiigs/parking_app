# Workflow Temp Folder

This folder is for cycle-scoped workflow artifacts that are useful during execution but are not automatically part of the durable workflow package.

Examples:

- scratch audit notes
- temporary implementation summaries
- session update summaries
- draft baselines that still need review
- one-cycle comparison docs
- temporary checklists created only to support one current task

## Rules

- Default here first when a workflow document is helpful for one cycle but is not yet clearly a durable source of truth.
- Do not put the core workflow engine files here.
- Do not leave stale files here forever.
- `SESSION_UPDATE.md` can be manually cleared by the user when a session is intentionally reset after commit and acknowledgment.

## Lifecycle

- `Developer` may create temporary cycle docs here.
- `Reviewer` should decide whether each temp artifact should be:
  - deleted
  - kept for one more cycle
  - promoted into a durable doc outside `workflow/temp/`
- `Planner` should check this folder at the start of planning and avoid building new work on stale temporary files unless they were explicitly retained.

## Durable vs Temp

Durable docs usually belong in the main `workflow/` folder when they become a reusable source of truth for future cycles.

Temp docs belong here when they are:

- narrow to one cycle
- likely to be replaced soon
- only supporting notes rather than standing references

If a temp doc becomes important beyond one cycle, promote it out of `workflow/temp/` and update any workflow references to point to the durable location.
