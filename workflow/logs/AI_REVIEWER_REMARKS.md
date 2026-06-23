# AI Reviewer Remarks

This file is the reviewer-owned record for findings, approval status, residual risk, and rework instructions.

Use this file after the developer finishes a cycle and before the planner advances the roadmap.

## Reviewer Rules

- Review the real repo state, not just the prompt.
- Prioritize bugs, regressions, missing validation, and misleading completion claims.
- Keep findings concrete and actionable.
- If rework is needed, say exactly what must change and who should act next.
- Do not silently edit the developer log to express disagreement. Write the review here.

## Decision Values

- `Approved`
- `Approved with follow-ups`
- `Changes requested`
- `Blocked by dependency`

## Current Review

### 2026-06-23 - Backend-Owned Gate Entry Confirmation Review

- `Current move/task`:
  Review the gate-entry confirmation SQL, operator API, mobile backend-state synchronization, tests, tracker claims, and developer validation against the planner brief.

- `Scope reviewed`:
  `supabase/confirm_parking_entry.sql`
  `supabase/schema.sql`
  `supabase/start_parking_session.sql`
  `supabase/start_walk_in_session.sql`
  `apps/parking-app-operator/app/api/operator/gate-entry/route.ts`
  `apps/parking-app-operator/lib/operatorAuth.ts`
  `apps/parking-app-operator/lib/operatorLocation.ts`
  `apps/parking-app-operator/lib/operatorLocationServer.ts`
  `apps/parking-app-operator/lib/operatorRouteSchemas.ts`
  `apps/mobile/src/lib/reservations.ts`
  `apps/mobile/src/features/parking/store/useParkingFlowStore.ts`
  `apps/mobile/src/features/parking/screens/ArrivalScreen.tsx`
  `apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx`
  `apps/mobile/src/features/parking/screens/SessionScreen.tsx`
  focused mobile and operator contract tests
  workflow tracker, developer log, state, and temp session update

- `Inputs reviewed`:
  `workflow/runtime/AI_DEVELOPER_PROMPT_NEXT_MOVE.md`
  `workflow/logs/AI_DEVELOPER_EXECUTION_LOG.md`
  `workflow/planning/ACTIVE_EXECUTION_TRACKER.md`
  the current dirty-worktree diff and validation evidence

- `Findings`:
  `[High]` The operator route proves only that the user has a global operator role and that the reservation belongs to the location currently selected in a cookie; it does not prove that the authenticated operator is assigned to or owns that location. `resolveOperatorLocationContext` loads every active location with the service-role key, and `setOperatorLocationSelection` lets an operator select any of them. A user with `edit-slot-status` can therefore switch to another active location and confirm that location's entry passes. This does not satisfy the brief's active-location ownership boundary and creates a cross-location privileged mutation path.
  `[Medium]` `confirm_parking_entry` returns an existing session before checking terminal reservation or session state. A completed reservation/session scan therefore returns `ok: true` as an idempotent confirmation and is logged as "Confirmed parking entry," even though the brief explicitly requires completed passes to fail. Idempotency should replay only an already-active valid entry confirmation; completed, cancelled, or otherwise terminal state must be rejected without a success response.
  `[Low]` The focused tests assert source strings but do not exercise the two security/state boundaries above. Add coverage that fails when an operator is not assigned to the target location and when completed or terminal sessions are rescanned; otherwise these regressions remain invisible while the suite stays green.

- `Validation checked`:
  Re-ran `npm.cmd --workspace apps/mobile run test`: passed 35 of 35 tests.
  Re-ran `npm.cmd --workspace apps/mobile run typecheck`: passed.
  Re-ran `npm.cmd --workspace apps/parking-app-operator run test`: passed 29 of 29 tests.
  Confirmed the developer's successful operator production build evidence and route discovery for `/api/operator/gate-entry`.
  Re-ran `git diff --check`: no failures; line-ending warnings only.
  Statically reviewed SQL grants, locking order, duplicate replay, terminal states, location resolution, mobile session hydration, backend grace fields, and stale walk-in cleanup.

- `Decision`:
  `Changes requested`

- `Manual actions required`:
  No external action is required before developer rework.
  After rework is approved, `Backend/DevOps` must deploy the SQL to a non-production Supabase project and test valid, duplicate-active, expired, cancelled, completed, wrong-location, unauthorized-location, and concurrent scans.
  `Operator/QA` must later connect and validate a real gate scanner client against the API; the current cycle provides only the route.

- `Required rework`:
  Enforce a durable user-to-location assignment or equivalent server-verified authorization boundary before the gate route can invoke the service-role RPC. A selectable location cookie and membership in the global active-location list are not authorization.
  Restrict SQL idempotent replay to an already-active session that represents a valid confirmed entry. Reject completed, cancelled, no-show, expired-without-active-entry, and other terminal states with non-success responses.
  Add focused tests for cross-location operator denial and terminal-session rescans. Prefer behavior-level route tests where practical; at minimum, make the SQL contract tests assert the required ordering and terminal guards.
  Adjust tracker completion claims if the rework cannot fully establish these boundaries in this cycle.

- `Safe follow-ups`:
  Live SQL execution and concurrency rehearsal remain staging work after repo rework.
  The gate scanner client, paid exit QR, exit grace, penalties, compensation, and full billing remain later planner-owned slices.

- `Temp artifact disposition`:
  Retain `workflow/temp/SESSION_UPDATE.md` through rework because it carries the current manual rollout checklist. Reviewer should update or clear it after this cycle is accepted.

- `Next owner`:
  `Developer`

## Findings Format

When there are material findings, prefer this format inside `Findings`:

- `[High]` issue summary
- `[Medium]` issue summary
- `[Low]` issue summary

If there are no findings, say so explicitly.

## Review Template

```md
### YYYY-MM-DD - Review Title

- `Current move/task`:
- `Scope reviewed`:
- `Inputs reviewed`:
- `Findings`:
- `Validation checked`:
- `Decision`:
- `Manual actions required`:
- `Required rework`:
- `Safe follow-ups`:
- `Temp artifact disposition`:
- `Next owner`:
```
