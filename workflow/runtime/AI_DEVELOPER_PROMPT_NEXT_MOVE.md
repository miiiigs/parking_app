# AI Developer Prompt - Next Move

This file is the planner-issued working brief for the active cycle.

It is not a durable source of truth and it does not outrank the plan, tracker, workflow state, or the repo itself.

Before acting on any prompt written here, read:

1. [MASTER_PRODUCTION_PLAN.md](../planning/MASTER_PRODUCTION_PLAN.md)
2. [ACTIVE_EXECUTION_TRACKER.md](../planning/ACTIVE_EXECUTION_TRACKER.md)
3. [AI_WORKFLOW_STATE.md](./AI_WORKFLOW_STATE.md)
4. [AI_DEVELOPER_EXECUTION_LOG.md](../logs/AI_DEVELOPER_EXECUTION_LOG.md)
5. [AI_REVIEWER_REMARKS.md](../logs/AI_REVIEWER_REMARKS.md)
6. [SUGGESTIONS_AND_IMPROVEMENTS_LOG.md](../logs/SUGGESTIONS_AND_IMPROVEMENTS_LOG.md)
7. [DEBUGGER_OUTPUT_LOG.md](../logs/DEBUGGER_OUTPUT_LOG.md)
8. [PROJECT_DOCUMENT_INDEX.md](../planning/PROJECT_DOCUMENT_INDEX.md)
9. Any relevant durable project document linked from the project document index

## Current Prompt

### 2026-06-25 - Track L UI/UX Hardening Pass 1 For Launch-Critical Surfaces

- `Objective`:
  Implement the first Track L repo slice by auditing and hardening the highest-risk launch-critical mobile and operator or admin surfaces for responsiveness, readability, spacing, and layout safety.

- `Why now`:
  Founder priority shifted after the accepted Track K customer-oversight review. The repo now has enough functional depth that cramped layouts, clipped actions, weak spacing, and unreadable text are a bigger near-term trust risk than adding more surface area. Track L is now the top queue item, while payment implementation is intentionally deferred until a separate consultation defines direction.

- `In scope`:
  Compare this brief against the real repo state first and inventory the concrete issues that still exist on the named surfaces before editing.
  Audit and fix the highest-severity mobile UI issues on `ReservationScreen`, `ArrivalScreen`, `SessionScreen`, `WalkInConfirmScreen`, and `WalkInQrScreen`, plus their route wrappers in `apps/mobile/app/` when those wrappers contribute to layout or safe-area problems.
  Audit and fix the highest-severity operator or admin UI issues on `/dashboard`, `/dashboard/parking-actions`, `/dashboard/access-control`, `/dashboard/manage-parking-lots`, and `/dashboard/customers`.
  Make only the supporting shared-layout changes that are directly needed for those surfaces, such as `dashboard-layout.tsx`, `location-switcher.tsx`, `parking-action-controls.tsx`, `location-management-panel.tsx`, `operation-detail-sheet.tsx`, or closely related shared UI wrappers.
  Fix the real issues found around small-phone, normal-phone, tall-phone, narrow-laptop, and common desktop usage, including safe areas, keyboard overlap, scroll behavior, sticky action reachability, clipped content, unreadable text, cramped cards or forms, poor wrapping, and hidden primary actions.
  Record any notable remaining UI risks that are intentionally left for a later Track L pass instead of silently implying the whole app was fully hardened.

- `Out of scope`:
  Do not implement payment provider work, payment settlement, or the Track D paid-exit backend contract in this cycle.
  Do not do staging-only Supabase proof, SQL migration work, role-model changes, or new backend business logic unless a tiny bug fix is strictly required to support a layout-safe screen.
  Do not turn this into a broad redesign, design-token overhaul, or a whole-app visual refresh.
  Do not spend cycle scope on lower-risk pages outside the named launch-critical surfaces unless a narrow shared fix unavoidably affects them.

- `Dependencies to respect`:
  `ACTIVE_EXECUTION_TRACKER.md` now places Track L ahead of Track K staging proof, Track D staging proof, and the deferred payment work.
  The accepted Track K customer-oversight page already exists and may receive UI hardening in this cycle, but its staging proof remains a separate manual follow-up.
  The debugger notes about rerunnable `admin_hardening.sql` and the Metro Android launch remain manual follow-ups and should not redirect this slice.

- `Constraints`:
  Implement only the missing UI hardening that is actually still absent in repo state.
  Prefer surgical layout, spacing, typography, overflow, and discoverability fixes over rewriting flows or introducing new product behavior.
  Preserve existing role gating, backend contracts, and accepted Track K behavior while improving the UI.
  Keep the slice reviewable in one cycle; if not every issue can land, prioritize hidden actions, broken overflow, unreadable text, and unsafe scroll states first.
  Payment-related screens may receive layout cleanup only if they are directly touched by shared fixes; payment feature implementation itself stays out of scope.

- `Required validation`:
  If mobile files change, run `npm --workspace apps/mobile run test` and `npm --workspace apps/mobile run typecheck`.
  If operator files change, run `npm --workspace apps/parking-app-operator run test` and `npm --workspace apps/parking-app-operator run build`.
  Run `git diff --check`.
  Include truthful manual viewport-check notes for the changed surfaces across at least one small-phone or tall-phone case and one narrow-laptop or common-desktop dashboard case.
  Call out any remaining layout or readability risks instead of implying the full Track L pass is complete.

- `Success criteria`:
  The named launch-critical surfaces no longer have obvious clipped or hidden primary actions, broken wrapping, unreadable text sizing, or non-scroll-safe states in the real repo UI.
  Shared layout fixes remain compatible with the accepted operator or admin role boundaries and Track K customer-oversight behavior.
  Validation and notes truthfully distinguish what was fixed now versus what remains for later UI hardening.

- `Expected deliverable`:
  A focused Track L repo slice that hardens the highest-risk launch-critical mobile and operator or admin surfaces, updates any truthful readiness or tracker notes needed by the changed UI, appends the execution log, and hands the baton to Reviewer.

- `Files likely involved`:
  `apps/mobile/src/features/parking/screens/ReservationScreen.tsx`
  `apps/mobile/src/features/parking/screens/ArrivalScreen.tsx`
  `apps/mobile/src/features/parking/screens/SessionScreen.tsx`
  `apps/mobile/src/features/parking/screens/WalkInConfirmScreen.tsx`
  `apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx`
  `apps/mobile/app/reservation/[lotId].tsx`
  `apps/mobile/app/arrival.tsx`
  `apps/mobile/app/session.tsx`
  `apps/mobile/app/walkin-confirm.tsx`
  `apps/mobile/app/walkin-qr.tsx`
  `apps/parking-app-operator/app/dashboard/page.tsx`
  `apps/parking-app-operator/app/dashboard/parking-actions/page.tsx`
  `apps/parking-app-operator/app/dashboard/access-control/page.tsx`
  `apps/parking-app-operator/app/dashboard/manage-parking-lots/page.tsx`
  `apps/parking-app-operator/app/dashboard/customers/page.tsx`
  `apps/parking-app-operator/components/layout/dashboard-layout.tsx`
  `apps/parking-app-operator/components/layout/location-switcher.tsx`
  `apps/parking-app-operator/components/dashboard/parking-action-controls.tsx`
  `apps/parking-app-operator/components/dashboard/location-management-panel.tsx`
  `apps/parking-app-operator/components/dashboard/operation-detail-sheet.tsx`
  `apps/mobile/PRODUCTION_READINESS_CHECKLIST.md`
  `apps/parking-app-operator/PRODUCTION_READINESS_CHECKLIST.md`
  `workflow/logs/AI_DEVELOPER_EXECUTION_LOG.md`
  `workflow/planning/ACTIVE_EXECUTION_TRACKER.md`
  `workflow/runtime/AI_WORKFLOW_STATE.md`

- `Reviewer focus areas`:
  Verify the developer fixed real layout and readability issues on the named surfaces rather than doing an unvalidated cosmetic sweep.
  Verify the changes preserve current functional behavior, role gating, and the accepted Track K customer-oversight behavior.
  Verify validation coverage matches the touched app surfaces and that any remaining UI risks are documented truthfully.
  Verify payment or backend scope did not creep back into this UI hardening slice.

- `Next owner after developer closeout`:
  `Reviewer`
