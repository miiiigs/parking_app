# Master Production Plan Initializer

Use this file to create or rebuild [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md) from a rough project idea, prompt, partial repo, or existing codebase.

## Goal

Create one practical planning document that explains:

- what the product or system is
- who it serves
- what production-ready means
- what is done, partial, not done, and unknown
- what phases should happen in dependency order
- what each phase's success gate is
- what is launch-critical versus later polish

## Minimum Inputs

- project name
- one-sentence description
- target users or operators
- core value or business outcome
- known tech stack or repository reality
- known risks or deadlines

## Prompt To Use

```md
Create or rebuild workflow_init/planning/MASTER_PRODUCTION_PLAN.md as the main planning reference for this project.

Use workflow_init/planning/MASTER_PRODUCTION_PLAN_INITIALIZER.md as the instruction source.

If the repository has useful implementation context, inspect it and use that reality in the plan.
If not enough implementation context exists, build the plan from the user prompt and clearly label assumptions.

Requirements:
- produce a concrete production-focused master plan
- include a product goal
- include a current reality snapshot
- separate confirmed done, partial, not done, and assumptions
- define major phases in dependency order
- give each phase a success gate
- separate launch-critical work from later polish
- optimize for planning usefulness, not marketing language
```
