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

### 2026-08-02 - Operator scan errors not aligned with hardened entry QR formats

- `Issue summary`:
  Operator QR scanning could reject a scan with the generic message `Entry verification failed` or `malformed reservation entry pass` even after the entry QR format was hardened for reservation and walk-in flows.
- `Why debugger was called`:
  The operator workflow needed a support pass to align current scan behavior with the newer entry QR payload formats and make field failures understandable for real operators.
- `Scope inspected`:
  `packages/shared/src/entryPass.ts`, `apps/parking-app-operator/app/api/operator/gate-entry/route.ts`, `apps/parking-app-operator/app/dashboard/parking-actions/page.tsx`, and `workflow/logs/DEBUGGER_OUTPUT_LOG.md`.
- `Observed root cause`:
  The operator API already had enough context to distinguish malformed, legacy, mismatched, reused, expired, and wrong-type QR cases, but the parking-actions screen still collapsed all non-OK responses into a generic thrown error. That hid the real failure reason and made hardened QR changes look like scanner breakage.
- `What was changed`:
  Kept the gate-entry route on structured `{ code, error }` responses for entry-pass validation failures and updated the parking-actions screen to consume those codes directly instead of always throwing a generic error.
  The operator UI now shows targeted feedback for wrong QR type, scanned reference text, outdated walk-in QR, expired pass, reused pass, not-found pass, mismatched pass, and validation-unavailable states.
- `Validation run`:
  `npm.cmd --workspace apps/parking-app-operator run build`
  Result: passed with successful Next.js production build and TypeScript checks.
- `Manual actions still required`:
  Smoke-test the operator scanner on a real device or browser with the current reservation entry QR and walk-in entry QR.
  Confirm the expected operator-facing wording for at least one invalid scan from each major class: wrong QR type, old walk-in QR, reused QR, and mismatched reservation QR.
- `Residual risk or follow-up`:
  This pass improves operator diagnosis only. If any mobile screen is still rendering an older QR payload or stale cached token, the operator now reports it more clearly, but the upstream generator would still need a separate fix.
- `Suggested planner note`:
  Treat this as a scan-alignment hardening follow-up across shared QR payload generation, mobile QR presentation, and operator verification UX. Future hardening should keep these three layers versioned together.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Reservation entry screen exposed reference text near the QR

- `Issue summary`:
  After the operator-side error messaging was aligned, a live scan still reported that it captured the booking reference text instead of the actual entry QR payload.
- `Why debugger was called`:
  Real-device scanning showed the operator camera was still able to read visible reservation reference text from the mobile screen, which made entry verification fail even though the encoded QR payload itself was valid.
- `Scope inspected`:
  `apps/mobile/src/features/parking/screens/ArrivalScreen.tsx`, `apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx`, and `workflow/logs/DEBUGGER_OUTPUT_LOG.md`.
- `Observed root cause`:
  The reservation arrival screen still rendered the human-readable reservation code as a prominent badge directly under the QR. On some scan attempts, that visible text was easier to capture than the QR payload, so the operator app correctly flagged it as reference text instead of a real entry pass.
- `What was changed`:
  Removed the visible reservation-code badge from the reservation entry screen, enlarged the QR block, and updated the caption so the QR remains the single scan target.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run typecheck`
  Result: passed.
- `Manual actions still required`:
  Re-test the reservation entry flow with a real operator scan against the updated mobile arrival screen.
  If any other screen still places human-readable `RSV-...` or `WIN-...` text near a scannable QR, remove or de-emphasize it as well.
- `Residual risk or follow-up`:
  Walk-in QR did not expose the same reservation-code badge in this pass, but future UI changes should keep visible reference labels away from the scan target area.
- `Suggested planner note`:
  Keep scan-target hygiene as part of QR hardening. Human-readable references are fine for support workflows, but they should not sit adjacent to the primary QR on customer-facing entry screens.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Walk-in screen could still render legacy `WIN-...` QR payloads

- `Issue summary`:
  A live operator scan still resolved to `WIN-walkin-access-034804`, which meant the mobile walk-in screen was rendering a legacy fallback payload instead of the hardened backend entry pass.
- `Why debugger was called`:
  The scan felt instant on the operator side, but the real failure was upstream: the mobile walk-in QR screen could still hand the scanner an outdated `WIN-...` value.
- `Scope inspected`:
  `apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx`, `apps/mobile/src/lib/reservations.ts`, `apps/mobile/src/features/parking/store/useParkingFlowStore.ts`, and `workflow/logs/DEBUGGER_OUTPUT_LOG.md`.
- `Observed root cause`:
  `WalkInQrScreen.tsx` still fell back to `activeWalkInBooking.reservationCode` when the hardened backend pair `{ reservationId, entryPassToken }` was missing. For older stored state, guest/local flow, or incomplete refreshes, that fallback produced a scannable but invalid `WIN-...` QR value.
- `What was changed`:
  Removed the legacy walk-in QR fallback from the mobile screen. The walk-in screen now renders a QR only when both the backend reservation ID and walk-in entry token are present; otherwise it blocks with a retry prompt instead of showing an invalid QR.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run typecheck`
  Result: passed.
- `Manual actions still required`:
  Reopen the walk-in flow and request a fresh entrance pass so the mobile app can fetch a hardened walk-in QR.
  If a device still shows the retry state repeatedly, verify that `issue_walk_in_entry_pass` is deployed and returning both `reservation_id` and `entry_token`.
- `Residual risk or follow-up`:
  Local or guest-mode walk-in flows no longer pretend to be operator-scannable, which is the safer behavior for production. If offline demo support is still needed later, it should use a clearly non-scannable placeholder rather than a legacy QR payload.
- `Suggested planner note`:
  Keep legacy fallback removal as part of QR hardening. Entry screens should never downgrade to public reference codes when backend-secured pass data is unavailable.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Walk-in retry state was masking guest-mode or missing-RPC backend prerequisites

- `Issue summary`:
  Even after the legacy QR fallback was removed, the mobile walk-in screen could stay in retry state because the secure token was never available.
- `Why debugger was called`:
  The user remained blocked on the walk-in QR screen and needed the actual prerequisite failure surfaced instead of another silent retry loop.
- `Scope inspected`:
  `apps/mobile/src/lib/reservations.ts`, `apps/mobile/src/lib/supabaseClient.ts`, `apps/mobile/.env`, `supabase/issue_walk_in_entry_pass.sql`, and `workflow/logs/DEBUGGER_OUTPUT_LOG.md`.
- `Observed root cause`:
  `issueWalkInEntryPass()` still downgraded to `toLocalWalkInBooking()` when the mobile app was in guest mode, when Supabase was unavailable, or when the backend `issue_walk_in_entry_pass` RPC signature was missing. That local fallback never returns a secure `entryPassToken`, so the UI could only keep retrying without explaining why.
- `What was changed`:
  Removed the secure walk-in fallback to local mode in `apps/mobile/src/lib/reservations.ts`.
  The function now throws explicit errors for three cases: missing mobile Supabase config, guest mode being active, or the backend `issue_walk_in_entry_pass` SQL not being deployed yet.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run typecheck`
  Result: passed.
- `Manual actions still required`:
  Reopen the walk-in flow once and read the new exact error shown on the retry screen.
  If it says guest mode, sign in with a real mobile account before requesting the walk-in QR.
  If it says the secure walk-in RPC is not deployed, run `supabase/issue_walk_in_entry_pass.sql` against the target Supabase project.
- `Residual risk or follow-up`:
  This patch improves diagnosis and blocks unsafe fallback behavior, but it does not itself deploy the SQL or switch the device out of guest mode.
- `Suggested planner note`:
  Treat secure walk-in entry as backend-dependent only. Guest-mode convenience flows should not masquerade as operator-scannable production entry passes.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Live Supabase RPC audit found stale walk-in and entry-confirmation contracts

- `Issue summary`:
  The user remained blocked on the walk-in retry screen and asked for an automated way to verify which SQL-backed RPCs had not been applied to the live Supabase project.
- `Why debugger was called`:
  Repo code and mobile env were no longer enough to explain the failure. A real deployment-contract audit against the active Supabase project was needed.
- `Scope inspected`:
  `apps/parking-app-operator/.env.local`, `scripts/audit-supabase-rpcs.mjs`, `package.json`, `supabase/issue_walk_in_entry_pass.sql`, `supabase/confirm_parking_entry.sql`, and the live Supabase OpenAPI schema at `https://zostounenvngcowsdrdb.supabase.co/rest/v1/`.
- `Observed root cause`:
  The live Supabase project is exposing older RPC contracts than the repo expects.
  `issue_walk_in_entry_pass` is still deployed with legacy required parameter `p_slot_id`, which proves the updated multi-location walk-in SQL has not been applied.
  `confirm_parking_entry` is also still missing the newer `p_entry_token` parameter, which means the hardened walk-in entry-token verification SQL has not been applied either.
- `What was changed`:
  Added a reusable remote audit script at `scripts/audit-supabase-rpcs.mjs`.
  Added root command `npm run audit:supabase-rpcs` so the planner or operator can re-check deployed RPC contracts after every SQL rollout.
- `Validation run`:
  `npm.cmd run audit:supabase-rpcs`
  Result:
  `FAIL issue_walk_in_entry_pass` because deployed contract still requires `p_slot_id`.
  `FAIL confirm_parking_entry` because deployed contract still omits `p_entry_token`.
  `PASS reserve_parking_slot`
  `PASS start_parking_session`
  `PASS start_walk_in_session`
  `PASS cancel_parking_reservation`
  `PASS end_parking_session`
  `PASS mobile_dashboard_snapshot`
  `PASS expire_stale_walk_in_entry_passes`
- `Manual actions still required`:
  Run `supabase/issue_walk_in_entry_pass.sql` against the active Supabase project.
  Run `supabase/confirm_parking_entry.sql` against the active Supabase project.
  After both succeed, rerun `npm run audit:supabase-rpcs` and confirm both RPCs pass.
  Then request a brand-new walk-in QR from the mobile app and retest operator scanning.
- `Residual risk or follow-up`:
  The audit checks exposed RPC contracts, not every table or trigger migration. Other non-RPC SQL drift may still exist, but the current walk-in blockage is directly explained by these two stale contracts.
- `Suggested planner note`:
  Keep remote contract auditing in the workflow after SQL changes. The current repo had already moved to tokenized walk-in entry, but the production-style project was still serving pre-hardening RPC signatures.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Walk-in screen could mask issuance failures behind the loading state

- `Issue summary`:
  After the SQL contracts were updated, the mobile app could still stay on `Preparing walk-in QR... Issuing your backend walk-in access pass.` indefinitely without exposing any actual error.
- `Why debugger was called`:
  The user remained blocked even after deploying the corrected RPCs, so the next step was to determine whether the backend was still failing or the UI was hiding the failure state.
- `Scope inspected`:
  `apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx`, `apps/mobile/src/providers/MobileParkingDataProvider.tsx`, and `workflow/logs/DEBUGGER_OUTPUT_LOG.md`.
- `Observed root cause`:
  `WalkInQrScreen.tsx` used `(isLoading || isIssuing)` to keep the issuing loader visible whenever parking data was still loading, even if `issueWalkInEntryPass()` had already failed and set `errorMessage`.
  That meant a failed or stalled backend call could be masked forever by the loading branch instead of showing the retry screen.
- `What was changed`:
  Narrowed the issuing loader so it only renders while `isIssuing` is true and there is no error message.
  Added a 15-second timeout guard around walk-in pass issuance so a hung request becomes a visible retry error instead of an endless spinner.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run typecheck`
  Result: passed.
- `Manual actions still required`:
  Reopen the walk-in flow and wait for the new explicit error state if the backend still does not complete issuance.
  Report the exact new error text that appears after timeout or failure; it will reveal whether the remaining problem is network, auth, or backend execution delay.
- `Residual risk or follow-up`:
  This patch improves diagnosis and prevents silent indefinite loading, but it does not eliminate any genuine backend latency or blocking condition if one still exists.
- `Suggested planner note`:
  Treat spinner masking as a workflow reliability issue. Critical mobile states that depend on backend RPCs should always fail visibly within a bounded time window.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Walk-in issuance effect was auto-retrying and erasing its own timeout error

- `Issue summary`:
  Even after adding a 15-second timeout, the user still only saw the preparing screen and no visible failure state.
- `Why debugger was called`:
  The timeout patch appeared ineffective in real use, which indicated a second control-flow bug on the screen rather than a backend-only problem.
- `Scope inspected`:
  `apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx` and `workflow/logs/DEBUGGER_OUTPUT_LOG.md`.
- `Observed root cause`:
  The issuance `useEffect()` re-ran automatically whenever `isIssuing` flipped back to `false`, because it only guarded on `vehicle`, `activeWalkInBooking`, and `isIssuing`.
  After a timeout or failure, the effect immediately started another issuance attempt, cleared `errorMessage`, and put the UI back into the same loading state before the user could ever see the timeout text.
- `What was changed`:
  Added an attempt guard with `lastIssuedAttemptRef` so each issuance attempt runs only once per `issueAttempt` value.
  Manual Retry now clears the old error and increments `issueAttempt`, while failed auto-attempts stay visible until the user explicitly retries.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run typecheck`
  Result: passed.
- `Manual actions still required`:
  Reload the mobile app bundle so the updated walk-in screen logic is active.
  Reopen the walk-in flow and wait for the first issuance attempt to finish or time out.
  If it still fails, capture the exact on-screen error text now that the loop no longer hides it.
- `Residual risk or follow-up`:
  This patch fixes the invisible retry loop, but it does not remove any genuine backend delay if the RPC itself is still slow or blocked.
- `Suggested planner note`:
  Treat auto-retry loops carefully in mobile effects. Silent retries are acceptable only when they preserve observability and do not overwrite the last actionable error.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Added forced timeout visibility after confirming live RPCs are updated

- `Issue summary`:
  The user still reported an endless walk-in preparation spinner even after the prior timeout and retry-loop fixes.
- `Why debugger was called`:
  A final support pass was needed to distinguish between an old mobile bundle still running and a genuine unresolved on-device issuance stall.
- `Scope inspected`:
  `apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx`, the live Supabase RPC audit, and live `reservations` / `walk_in_entry_pass_tokens` data via service-role REST access.
- `Observed root cause`:
  The live RPC contracts now pass the deployed-schema audit, but live token data still shows no rows in `walk_in_entry_pass_tokens`, so the current device flow is not reaching a successful issued-token state.
  Because the user still reported the spinner with no error, the UI needed a state-level timeout fallback that does not depend solely on the issuance promise resolving or rejecting.
- `What was changed`:
  Added a screen-level issuance timeout state in `WalkInQrScreen.tsx` that forces the UI out of the spinner after 15 seconds even if the issuance promise never settles.
  Added a small `walkin-debug v3` dev-only marker so reloaded devices can confirm they are running the latest debugging bundle and expose the live screen state.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run typecheck`
  Result: passed.
- `Manual actions still required`:
  Reload the mobile JavaScript bundle fully and reopen the walk-in flow.
  Confirm whether the screen now shows `walkin-debug v3`.
  If it does, wait 15 seconds and report the exact visible state or error text.
- `Residual risk or follow-up`:
  If `walkin-debug v3` never appears, the current device is almost certainly still running an older bundle and no further in-repo UI fix will be visible until the app reloads the updated code.
- `Suggested planner note`:
  Keep a lightweight dev-only version marker available during workflow-critical mobile debugging. It sharply reduces ambiguity between stale bundle behavior and genuine runtime regressions.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Issuance timeout was being cancelled by the effect dependency cycle

- `Issue summary`:
  The user confirmed the latest bundle was running and showed `walkin-debug v3 | loading=false issuing=true timedout=false attempt=0`, but the timeout still never surfaced.
- `Why debugger was called`:
  That live debug state proved the screen was mounted and issuing had started, so the only remaining explanation was an internal effect lifecycle bug cancelling its own timeout path.
- `Scope inspected`:
  `apps/mobile/src/features/parking/screens/WalkInQrScreen.tsx` and `workflow/logs/DEBUGGER_OUTPUT_LOG.md`.
- `Observed root cause`:
  The issuance `useEffect()` still depended on `isIssuing`.
  As soon as the effect set `isIssuing=true`, React re-ran the effect, executed the cleanup for the previous run, and cleared the pending timeout while also marking the attempt inactive.
  That left the UI stuck at `issuing=true timedout=false` and prevented both timeout and error state updates from appearing.
- `What was changed`:
  Removed `isIssuing` from the effect dependency cycle and replaced the re-entry guard with `issueInFlightRef`, so the first issuance attempt can complete, fail, or time out without being cancelled by its own state update.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run typecheck`
  Result: passed.
- `Manual actions still required`:
  Reload the mobile bundle again so the corrected effect lifecycle is active.
  Reopen the walk-in flow and wait at least 15 seconds.
  Report the new visible result after the wait: either a timeout error, a backend error, or a rendered QR.
- `Residual risk or follow-up`:
  If the screen still does not advance after this exact fix is loaded, the remaining issue is likely inside the underlying Supabase request path itself rather than the walk-in screen state machine.
- `Suggested planner note`:
  Be cautious with async effects that both depend on and mutate the same status state. Cleanup can accidentally cancel the very timeout or completion path being used for debugging.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Live walk-in issuance failed because crypto helpers were called outside the `extensions` schema

- `Issue summary`:
  After the mobile screen finally surfaced the backend failure, the walk-in flow showed `Walk-in QR not available. function gen_random_bytes(integer) does not exist`.
- `Why debugger was called`:
  This error indicated the request had reached the updated RPC, but the SQL implementation itself was still failing at runtime in the live database.
- `Scope inspected`:
  `supabase/issue_walk_in_entry_pass.sql`, `supabase/confirm_parking_entry.sql`, `apps/mobile/tests/walkInContract.test.mjs`, `apps/mobile/tests/backendContract.test.mjs`, and `workflow/logs/DEBUGGER_OUTPUT_LOG.md`.
- `Observed root cause`:
  The SQL functions use `set search_path = public`, but `gen_random_bytes(...)` and `digest(...)` come from the Supabase `extensions` schema.
  `gen_random_uuid()` still worked because newer Postgres versions expose it from core, which made the schema issue easy to miss.
  At runtime, `issue_walk_in_entry_pass` failed when trying to call `gen_random_bytes(18)` without the `extensions.` qualifier.
- `What was changed`:
  Updated `supabase/issue_walk_in_entry_pass.sql` to call `extensions.gen_random_bytes(18)` and `extensions.digest(...)`.
  Updated `supabase/confirm_parking_entry.sql` to call `extensions.digest(...)` for walk-in token verification.
  Added contract assertions so the mobile test suite now checks for the extension-qualified crypto calls.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run test`
  Result: passed 37 of 37 tests.
- `Manual actions still required`:
  Re-run `supabase/issue_walk_in_entry_pass.sql` on the active Supabase project.
  Re-run `supabase/confirm_parking_entry.sql` on the active Supabase project so both issue and verify paths use the same crypto helper schema.
  Request a fresh walk-in QR after the SQL update.
- `Residual risk or follow-up`:
  The deployed RPC signatures are already aligned, so this is now a runtime implementation fix rather than a contract mismatch.
  If another crypto-related error appears after rerun, inspect for any remaining unqualified pgcrypto helpers in future SQL additions.
- `Suggested planner note`:
  For Supabase security-definer SQL, prefer explicit `extensions.` qualification for pgcrypto helpers instead of relying on search path assumptions.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Scanner-side entry confirmation failed because `reservation_id` was ambiguous inside the RPC

- `Issue summary`:
  After walk-in issuance progressed further, the operator scanner failed with `Entry verification failed, column reference "reservation_id" is ambiguous`.
- `Why debugger was called`:
  The walk-in QR had advanced past issuance, so the next blocker was inside the entry-confirmation SQL path used by the operator scanner.
- `Scope inspected`:
  `supabase/confirm_parking_entry.sql`, `apps/mobile/tests/backendContract.test.mjs`, and `workflow/logs/DEBUGGER_OUTPUT_LOG.md`.
- `Observed root cause`:
  `confirm_parking_entry(...)` is a `returns table` function with an output column named `reservation_id`.
  Several token-lookup and token-update statements inside the function also used bare `reservation_id` in `where` clauses against `walk_in_entry_pass_tokens`, which PostgreSQL treated as ambiguous in PL/pgSQL scope.
- `What was changed`:
  Qualified the affected clauses to `walk_in_entry_pass_tokens.reservation_id = p_reservation_id` in `supabase/confirm_parking_entry.sql`.
  Added a contract assertion so the mobile test suite now checks for the qualified token lookup.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run test`
  Result: passed 37 of 37 tests.
- `Manual actions still required`:
  Re-run `supabase/confirm_parking_entry.sql` against the active Supabase project.
  Then retry the operator scan with a newly issued walk-in QR.
- `Residual risk or follow-up`:
  This is a PL/pgSQL naming-scope fix only. If another runtime SQL error appears after redeploy, it is likely a separate live-schema drift rather than this ambiguity returning.
- `Suggested planner note`:
  In `returns table` SQL functions, avoid unqualified references that reuse output-column names; qualify them explicitly to prevent runtime ambiguity in Supabase/Postgres.
- `Resolution status`:
  `Patched, manual validation required`

### 2026-08-02 - Full flow audit isolated the last live schema gap to `parking_slots.slot_kind`

- `Issue summary`:
  After successive walk-in and scanner fixes, the user asked for a full pass over the flow to reduce further runtime surprises and then hit `column "slot_kind" does not exist`.
- `Why debugger was called`:
  The walk-in flow had already crossed multiple live-schema mismatches, so a broader audit was needed to distinguish the last active blocker from already-fixed issues.
- `Scope inspected`:
  `supabase/confirm_parking_entry.sql`, `scripts/audit-supabase-rpcs.mjs`, the live Supabase REST schema/data, `apps/mobile/tests/backendContract.test.mjs`, and `workflow/logs/DEBUGGER_OUTPUT_LOG.md`.
- `Observed root cause`:
  The live project still lacks `parking_slots.slot_kind`, but the hybrid walk-in flow now depends on it for walk-in hub assignment and safe slot release behavior.
  The expanded live audit shows all expected RPC contracts already pass, and the other walk-in-related schema surfaces now pass too (`parking_sessions` grace columns, `reservations.source`, `walk_in_entry_pass_tokens`).
  The only failing live audit item is `parking_slots.slot_kind`.
- `What was changed`:
  Updated `supabase/confirm_parking_entry.sql` so it now self-heals `parking_slots.slot_kind` by:
  adding the column if missing,
  backfilling existing rows to `standard`,
  setting the default and `not null`,
  and adding the `('standard', 'walk_in_hub')` check constraint.
  Extended `scripts/audit-supabase-rpcs.mjs` into a broader flow audit that now checks required schema columns in addition to RPC signatures.
  Added regression assertions covering the new `slot_kind` migration block.
- `Validation run`:
  `npm.cmd --workspace apps/mobile run test`
  Result: passed 37 of 37 tests.
  `npm.cmd run audit:supabase-rpcs`
  Result: all RPC contracts pass, and the only failing live audit item is `parking_slots.slot_kind`, confirming the last currently known live blocker.
- `Manual actions still required`:
  Re-run `supabase/confirm_parking_entry.sql` against the active Supabase project.
  Re-run `npm run audit:supabase-rpcs` and confirm `parking_slots.slot_kind` changes from `FAIL` to `PASS`.
  Then issue a fresh walk-in QR and retry the operator scan.
- `Residual risk or follow-up`:
  No audit can guarantee zero future runtime issues, but the current automated flow audit narrows the known live mismatch set to this single missing column.
- `Suggested planner note`:
  Keep the broadened Supabase flow audit in the workflow after every SQL rollout. It is now catching both RPC drift and required schema-column drift for the walk-in/operator pipeline.
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
