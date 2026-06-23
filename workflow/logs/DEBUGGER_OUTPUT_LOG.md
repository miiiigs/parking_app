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
