# Master Production Plan Initializer

Use this file to create or rebuild [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md) even when you only have prompts, rough ideas, or partial context.

This file exists because the master production plan is the main planning reference for a project.

For a new project, the workflow should begin here.

## Purpose

This initializer helps you turn a raw project idea into a usable master production plan without requiring outside documents first.

It is designed for cases where you have:

- a user prompt
- a product idea
- a rough repo
- a partial codebase
- a planning conversation
- or no durable project documents yet

## Main Rule

If the project does not yet have a trustworthy [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md), build that first before trying to operate the full planner and tracker loop.

The master plan is the main planning anchor.

The tracker, baton, and execution loop become much stronger only after the master plan exists.

## What The Initializer Should Produce

The goal is one first usable `MASTER_PRODUCTION_PLAN.md` that explains:

- what the product or project is trying to achieve
- what "production-ready" means
- what is already true
- what is partially true
- what is not done
- the major phases in the right order
- the success gate for each phase
- what is launch-critical versus later polish

## Minimum Inputs

You can build a first master plan from only these:

- product or project name
- one-sentence description of what it should do
- target users or operators
- main value or business outcome
- any known tech stack or repo reality

Everything else can start as explicit assumptions.

## When To Use Prompts Only

Use prompt-only initialization when:

- the project is brand new
- the repo exists but planning is weak
- the docs are missing
- the current plan is too outdated to trust
- the user can explain the goal faster than the repo can explain itself

## Initialization Process

### Step 1: Capture the project brief

Write down:

- project name
- product or system type
- who it serves
- the core problem
- the core outcome

If details are missing, state assumptions clearly instead of blocking.

### Step 2: Define the production goal

Describe what a successful production outcome looks like.

This should include:

- user-facing outcome
- operational outcome
- reliability or trust outcome
- business outcome when relevant

### Step 3: Write the current reality snapshot

Split the current state into:

- confirmed done
- confirmed partial
- confirmed not done
- unknowns or assumptions

If the repo is available, scan it.

If the repo is not available or the project is new, use prompt-derived assumptions and label them honestly.

### Step 4: Define the master sequence

Break the project into major phases in dependency order.

Each phase should contain:

- status
- already done
- still required
- success gate
- future polish

### Step 5: Separate launch-critical from later work

Make sure the plan distinguishes:

- must-have before launch or rollout
- recommended before scale
- valuable but post-launch

### Step 6: Record assumptions

If information is missing, record assumptions directly in the plan instead of pretending certainty.

That keeps later planning honest.

## Prompt Questions To Ask

If you need to build the plan from conversation, these questions are enough:

1. What is the project called?
2. What does it do in one or two sentences?
3. Who are the main users or operators?
4. What problem is it solving?
5. What would "production-ready" mean for this project?
6. What already exists today?
7. What is clearly missing?
8. Are there any launch deadlines, pilot goals, or rollout constraints?
9. What tech stack or platform is already chosen?
10. What parts feel highest risk right now?

## Plan-Writing Rules

- prefer concrete phases over vague themes
- include success gates
- keep "done" tied to validation, not intent
- separate confirmed facts from assumptions
- do not overfit the first draft; it should be usable, not perfect
- write for future planning decisions, not for marketing copy

## Starter Format

Use this structure for a new [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md):

```md
# Master Production Plan

This document is the main planner for `<Project Name>`.

Planning rule:
- We do not move to the next major step until the current step passes its success gate.
- "Done" means implemented and validated at the level stated in the gate.
- "Partial" means meaningful progress exists, but the gate has not been met yet.
- Each step includes future polish so we can separate launch-critical work from later improvements.

## Product Goal

<What the project is trying to achieve and why it matters.>

## Current Reality Snapshot

### Confirmed done

- [ ] item

### Confirmed partial

- [ ] item

### Confirmed not done

- [ ] item

### Assumptions and unknowns

- assumption or unknown

## Master Sequence

## Phase 0 - Product and Business Foundation

Status:
- [ ] Not started

Already done:
- [ ] item

Still required:
- [ ] item

Success gate:
- clear gate

Future polish:
- item

## Phase 1 - Architecture and Environment Foundation

Status:
- [ ] Not started

Already done:
- [ ] item

Still required:
- [ ] item

Success gate:
- clear gate

Future polish:
- item

## Phase 2 - Core Workflow

Status:
- [ ] Not started

Already done:
- [ ] item

Still required:
- [ ] item

Success gate:
- clear gate

Future polish:
- item

## Phase 3 - Reliability, Operations, and Rollout

Status:
- [ ] Not started

Already done:
- [ ] item

Still required:
- [ ] item

Success gate:
- clear gate

Future polish:
- item
```

## Reusable Initialization Prompt

Use this prompt in a new thread when you want Codex to create the first master plan:

```md
Create or rebuild workflow/planning/MASTER_PRODUCTION_PLAN.md as the main planning reference for this project.

Use workflow/planning/MASTER_PRODUCTION_PLAN_INITIALIZER.md as the instruction source.

If the repository has useful implementation context, inspect it and use that reality in the plan.
If not enough implementation context exists, build the plan from the user prompt and clearly label assumptions.

Requirements:
- produce a concrete production-focused master plan
- include a product goal
- include a current reality snapshot
- separate confirmed done, partial, not done, and assumptions
- define the major phases in dependency order
- give each phase a success gate
- separate launch-critical work from later polish
- optimize for planning usefulness, not marketing language
```

## Relationship To The Rest Of The Workflow

The order is:

1. Use this initializer to create the first master plan.
2. Use the master plan to shape the tracker.
3. Use the tracker to drive the current cycle.
4. Use the baton, brief, execution log, and reviewer remarks to operate the ongoing loop.

That is why this file exists: the workflow needs a reliable starting point, and that starting point is the master production plan.
