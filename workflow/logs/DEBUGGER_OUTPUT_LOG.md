# Debugger Output Log

This file is the manual debugger record for active error investigations, bug fixes, and root-cause analysis work that happens outside the automated baton cycle.

Use this file to:

- keep error investigation history visible
- give the `Planner` better context before the next cycle
- show the `Reviewer` what debug work was done and whether it is safe to clear
- avoid losing context when a manual debug pass changes the repo between normal cycles

## Lifecycle

- The `Debugger` updates this file during a manual debugging pass.
- The `Planner` reads this file when the recent error context matters for the next cycle.
- The `Reviewer` may reset or clear this file when the debugging work is accepted and no longer active.

## Reset Rule

When the debug issue is resolved and accepted, the `Reviewer` may replace the active section with:

```md
## Active Debug Session

No active debugger work.
The previous debugger log was accepted and cleared by review.
```

## Active Debug Session

### 2026-08-02 - Hybrid walk-in flow no longer requires payment or slot selection

- `Issue summary`:
  The mobile walk-in flow still forced payment-method selection and slot selection before showing a QR, while the requested hybrid model requires a generic walk-in QR that any supported operator can confirm without consuming reservation-managed slots.
- `Why debugger was called`:
  The current walk-in implementation was structurally incompatible with the intended operational flow, so the repo needed a root-cause contract change rather than a UI-only patch.
- `Scope inspected`:
  `apps/mobile/src/features/parking/screens/WalkInConfirmScreen.tsx`, `apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx`, `apps/mobile/src/features/parking/store/useParkingFlowStore.ts`, `apps/mobile/src/lib/reservations.ts`, `apps/mobile/src/lib/parkingData.ts`, `apps/mobile/app/validate.tsx`, `apps/mobile/tests/walkInContract.test.mjs`, `apps/parking-app-operator/lib/parkingLotLayout.ts`, `supabase/schema.sql`, `supabase/issue_walk_in_entry_pass.sql`, `supabase/confirm_parking_entry.sql`, `supabase/cancel_parking_reservation.sql`, and `supabase/expire_stale_walk_in_entry_passes.sql`.
- `Observed root cause`:
  Walk-in passes were modeled as reserved-slot holds from the moment of issuance. That meant the QR contract, workflow restore logic, expiry cleanup, and operator confirmation path all assumed a concrete `slot_id`, so the app could not support a true location-agnostic walk-in pass without changing the backend contract.
- `What was changed`:
  Reworked walk-in issuance so the mobile app requests a generic walk-in pass without payment-method or slot selection.
  Updated operator confirmation to attach confirmed walk-ins to a hidden `walk_in_hub` slot per location, keeping reservation-managed slots out of the hybrid walk-in path.
  Allowed reservations to carry a nullable `slot_id` before operator confirmation and hardened cancellation plus stale-expiry cleanup for slotless walk-in passes.
  Filtered `walk_in_hub` slots out of mobile/operator map inventory, updated mobile workflow restore/session mapping for generic walk-in passes, removed the walk-in QR progress bar, and refreshed the walk-in contract tests.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run typecheck`
  `npm.cmd --workspace apps/mobile run test`
  `npm.cmd --workspace apps/parking-app-operator run test`
  `npm.cmd --workspace apps/parking-app-operator run build`
- `Manual actions still required`:
  Apply the updated Supabase SQL files before expecting the live app to follow the new hybrid walk-in behavior.
  Rehearse one real device walk-in entry using an operator account after the SQL is applied, because the end-to-end confirmation path now depends on the new `walk_in_hub` slot contract.
- `Residual risk or follow-up`:
  Existing staging or local databases that still use the old walk-in RPC signature and non-null reservation-slot assumptions will mismatch the app until the SQL is applied.
  The hidden hub-slot model intentionally keeps walk-ins out of reservation inventory, but any future reporting that assumes every active session maps to a standard slot should be reviewed before expanding dashboard analytics.
- `Suggested planner note`:
  Treat this as a backend-contract and mobile-workflow change, not just a UI adjustment. Future planning should account for rollout sequencing: SQL first, then mobile/operator smoke validation on a real environment.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-06-25 - Admin hardening SQL rerun fails on existing trigger

- `Issue summary`:
  Running `supabase/admin_hardening.sql` failed with `ERROR: 42710: trigger "set_admin_user_roles_updated_at" for relation "admin_user_roles" already exists`.
- `Why debugger was called`:
  Manual Supabase setup was blocked by a repeat-run failure in a core hardening script that should be safe to reapply in non-production environments.
- `Scope inspected`:
  `workflow/planning/MASTER_PRODUCTION_PLAN.md`, `workflow/planning/ACTIVE_EXECUTION_TRACKER.md`, `workflow/runtime/AI_WORKFLOW_STATE.md`, `workflow/logs/DEBUGGER_OUTPUT_LOG.md`, `supabase/admin_hardening.sql`, `supabase/schema.sql`, and `supabase/README.md`.
- `Observed root cause`:
  `supabase/admin_hardening.sql` created the `set_admin_user_roles_updated_at` trigger unconditionally even though the rest of the file already uses `drop trigger if exists ...` for rerunnable audit-trigger setup. On a second run, Postgres rejected the duplicate trigger creation.
- `What was changed`:
  Added `drop trigger if exists set_admin_user_roles_updated_at on admin_user_roles;` immediately before recreating the trigger in `supabase/admin_hardening.sql`.
- `Validation run`:
  Re-read the patched SQL and confirmed the failing trigger now uses the same idempotent drop-and-recreate pattern as the other triggers in the file.
  Verified the relevant trigger definitions in `supabase/admin_hardening.sql` now appear in safe rerunnable pairs.
- `Manual actions still required`:
  Re-run `supabase/admin_hardening.sql` in Supabase.
  If that succeeds, continue with the next SQL files in the documented order and note any further non-idempotent objects that surface.
- `Residual risk or follow-up`:
  This fixes the reported trigger collision only. A real non-production Supabase bootstrap rehearsal is still needed to catch any other migration-order or repeat-run gaps across the broader SQL baseline.
- `Suggested planner note`:
  Treat this as a migration-discipline hardening fix under Track A and Track K follow-up work, not as a completed staging proof.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-06-23 - Expo Android startup crash from Metro watching sibling Next build output

- `Issue summary`:
  `expo run:android` for `apps/mobile` crashed before app startup with `ENOENT: no such file or directory, watch 'C:\dev\parking_app\apps\parking-app-operator\.next\server\app\dashboard\admin-tools'`.
- `Why debugger was called`:
  Mobile development was blocked by a startup-time Metro watcher failure, and the active reviewer baton did not cover this unrelated local runtime breakage.
- `Scope inspected`:
  `workflow/planning/MASTER_PRODUCTION_PLAN.md`, `workflow/planning/ACTIVE_EXECUTION_TRACKER.md`, `workflow/runtime/AI_WORKFLOW_STATE.md`, `workflow/logs/DEBUGGER_OUTPUT_LOG.md`, `apps/mobile/metro.config.js`, `apps/mobile/package.json`, `apps/mobile/tests/*.test.mjs`, root `package.json`, and the operator workspace build output under `apps/parking-app-operator/.next`.
- `Observed root cause`:
  Expo's default workspace-aware Metro config was auto-watching the sibling `apps/parking-app-operator` workspace even though the mobile app only imports `packages/shared`. That pulled transient Next.js build output like `.next/server/app/dashboard/admin-tools` into Metro's file graph, and Metro's fallback watcher crashed when that generated directory was missing or being replaced.
- `What was changed`:
  Restricted Metro watch roots to `node_modules`, `apps/mobile`, and `packages/shared`; added a defensive block-list pattern for sibling app build artifacts such as `.next`, `dist`, and `build`; added `apps/mobile/tests/metroConfig.test.mjs` to keep the mobile workspace from re-watching the operator app in future edits.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run test` passed 37 of 37 tests, including the new Metro config coverage.
  A direct config probe confirmed Metro watch folders are now only `C:\dev\parking_app\node_modules`, `C:\dev\parking_app\apps\mobile`, and `C:\dev\parking_app\packages\shared`.
  `CI=1 npm.cmd --workspace apps/mobile run start` reached `Starting Metro Bundler` without reproducing the prior `ENOENT` watcher crash during the smoke-test window.
- `Manual actions still required`:
  Re-run `npm --workspace apps/mobile run android` on the intended emulator or device to confirm the full native launch path stays stable after Metro serves the bundle.
- `Residual risk or follow-up`:
  If the mobile app later imports code from another workspace package, `apps/mobile/metro.config.js` will need that package added explicitly to `watchFolders` instead of relying on Expo's broader auto-discovery.
- `Suggested planner note`:
  Treat this as a monorepo tooling hardening fix, not progress on the active gate-entry reviewer cycle; keep the current baton owner unchanged.
- `Resolution status`:
  `Patched, manual validation required`

When the debugger is called, replace the section above with the template below.

```md
## Active Debug Session

### YYYY-MM-DD - Debug Title

- `Issue summary`:
- `Why debugger was called`:
- `Scope inspected`:
- `Observed root cause`:
- `What was changed`:
- `Validation run`:
- `Manual actions still required`:
- `Residual risk or follow-up`:
- `Suggested planner note`:
- `Resolution status`:
```

## Resolution Status Values

- `Investigating`
- `Patched, needs review`
- `Patched, manual validation required`
- `Resolved`
- `Blocked`
