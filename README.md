# Smart Parking Reservation System

Monorepo scaffold for the Smart Parking Reservation System startup idea.

## Structure

- `apps/mobile` - primary React Native app for drivers
- `apps/parking-app-operator` - Next.js operator and admin dashboard for lot operations
- `packages/shared` - shared TypeScript types
- `supabase` - backend planning and schema notes

## Core operational docs

- [workflow/README.md](./workflow/README.md) - folder map for the reorganized workflow package
- [workflow/guide/THREE_PERSONA_DEVELOPMENT_WORKFLOW.md](./workflow/guide/THREE_PERSONA_DEVELOPMENT_WORKFLOW.md) - full planner, developer, reviewer operating cycle
- [workflow/planning/MASTER_PRODUCTION_PLAN_INITIALIZER.md](./workflow/planning/MASTER_PRODUCTION_PLAN_INITIALIZER.md) - bootstrap guide for creating the master production plan from prompts or partial context
- [workflow/planning/MASTER_PRODUCTION_PLAN.md](./workflow/planning/MASTER_PRODUCTION_PLAN.md) - master production sequence and launch gates
- [workflow/planning/ACTIVE_EXECUTION_TRACKER.md](./workflow/planning/ACTIVE_EXECUTION_TRACKER.md) - current execution order and active progress tracking
- [workflow/logs/AI_DEVELOPER_EXECUTION_LOG.md](./workflow/logs/AI_DEVELOPER_EXECUTION_LOG.md) - running log of what the active developer actually completed and validated
- [workflow/personas/PLANNER_PERSONA.md](./workflow/personas/PLANNER_PERSONA.md) - reusable planner persona prompt
- [workflow/personas/DEVELOPER_PERSONA.md](./workflow/personas/DEVELOPER_PERSONA.md) - reusable developer persona prompt
- [workflow/personas/REVIEWER_PERSONA.md](./workflow/personas/REVIEWER_PERSONA.md) - reusable reviewer persona prompt

## Next build step

1. Continue the workflow from [workflow/runtime/AI_WORKFLOW_STATE.md](./workflow/runtime/AI_WORKFLOW_STATE.md).
2. Build the operator-facing Parking Actions entry scan/manual confirmation workflow against the reviewed gate-entry API.
3. Keep Supabase staging bootstrap, operator-location assignment provisioning, and live gate-confirmation rehearsal as explicit manual follow-ups.
4. Keep paid exit authorization, payment provider integration, penalties, compensation, and production observability as open launch-critical tracks.
5. Use `expo run:android` for local native testing and EAS builds for release instead of Expo Go for native features.
6. Follow the Android build checklist in [ANDROID_BUILD_CHECKLIST.md](ANDROID_BUILD_CHECKLIST.md).
