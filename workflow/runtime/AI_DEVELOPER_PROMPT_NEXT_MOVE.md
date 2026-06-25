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

### 2026-06-25 - Add Admin Customer Oversight Surface

- `Objective`:
  Implement the next Track K repo slice by adding an admin-only customer oversight surface in `parking-app-operator` so admins can review customer contact and activity across lots without relying on direct database access.

- `Why now`:
  The accepted Track K foundations already cover dashboard-role onboarding, lot assignment, lot management, and operator or admin navigation. The remaining highest-value repo gap in that track is broader admin customer oversight, while the Supabase proof items are still manual follow-ups outside the repo. The repo audit confirms the needed inputs already exist: reservations carry `user_id`, the dashboard already reads reservation, session, payment, and location data, and service-role auth helpers already exist for dashboard-user lookup and invite flows.

- `In scope`:
  Audit the current reservation, session, payment, auth-admin, and dashboard layout contracts before editing.
  Add a read-only admin-only customer oversight page and any matching server route or helper needed to load the data safely.
  Use existing reservation, session, payment, location, and auth data to show a practical customer summary that helps admins support operations, such as customer identifier or contact details, latest or active lot context, recent reservation or session counts, recent payment state, recent vehicle plates, and latest activity timestamps.
  Surface whether a customer identity also appears in `admin_user_roles` so admins can see dashboard-versus-customer overlap instead of guessing.
  Keep the new surface clearly grouped with the admin-only control plane in the dashboard navigation without disturbing the already accepted operational-first ordering for non-admin users.
  Add focused search, filtering, pagination, or compact summary behavior as needed so the page remains usable without trying to solve full analytics in one cycle.
  Update focused tests and docs so the new admin-only surface, its read-only intent, and the identity-overlap visibility are described truthfully.

- `Out of scope`:
  Do not broaden non-admin visibility into customer-wide data in this cycle.
  Do not implement customer mutations, refunds, payment settlement tooling, manual compensation flows, support-ticket workflows, or finance analytics.
  Do not reopen the accepted `Access Control`, `Manage Parking Lots`, invitation, assignment, `Operator Tools`, or location-switcher slices except for narrow navigation or shared helper touchpoints required by the new page.
  Do not depend on new SQL migrations, new permanent schema objects, or staging-only Supabase proof work unless a tiny contract fix is truly required to read already-existing data.

- `Dependencies to respect`:
  `ACTIVE_EXECUTION_TRACKER.md` now records admin customer oversight as the next Track K repo slice, while staging proof for lot management and invitation onboarding remains a separate manual follow-up.
  The current repo already enforces admin-only access-control and lot-management surfaces, explicit dashboard-versus-customer identity boundaries, non-admin location scoping, and accepted navigation grouping.
  `supabase/schema.sql` already stores `reservations.user_id`, and the operator app already uses service-role-backed Supabase access plus auth-admin helpers in `operatorAdminAccess.ts`.
  The debugger notes about rerunnable `admin_hardening.sql` and the Metro Android launch remain manual follow-ups and should not redirect this slice.

- `Constraints`:
  Keep the new surface admin-only and read-only unless a tiny supporting write is unavoidable, then justify it explicitly.
  Prefer existing repo contracts and light helper additions over inventing a new customer-domain architecture.
  Preserve the explicit boundary between customer mobile identities and dashboard access; overlap should be visible and explainable, not silently normalized.
  Keep scope narrow enough for one reviewable cycle: customer visibility and summarization first, not full support operations or analytics.
  Avoid leaking all-lot customer visibility into support, finance, or operator roles unless the repo already proves that access is intended and safe.

- `Required validation`:
  Run `npm --workspace apps/parking-app-operator run test`.
  Run `npm --workspace apps/parking-app-operator run build`.
  Run `git diff --check`.
  Statically verify admin-only route or navigation gating, read-only behavior, cross-lot customer summary accuracy, and explicit dashboard-account overlap signaling.
  State clearly what customer identity fields are truly available from current repo data versus what still remains unavailable without deeper auth or schema work.

- `Success criteria`:
  Admins have a usable dashboard surface for reviewing customer activity across lots without direct SQL.
  The page makes customer-versus-dashboard identity overlap visible when it exists.
  Non-admin roles do not gain new global customer visibility.
  The slice uses existing repo data safely and does not overclaim staging proof, bootstrap replacement, or finance-support workflow completion.
  Tests and docs match the resulting route, gating, and data limitations truthfully.

- `Expected deliverable`:
  A focused Track K repo slice adding an admin-only customer oversight page plus any supporting route or helper code, navigation entry, focused tests, truthful docs, execution-log update, and baton handoff to Reviewer.

- `Files likely involved`:
  `apps/parking-app-operator/app/dashboard/`
  `apps/parking-app-operator/app/api/operator/`
  `apps/parking-app-operator/components/layout/dashboard-layout.tsx`
  `apps/parking-app-operator/lib/operatorAdminAccess.ts`
  `apps/parking-app-operator/lib/operatorScopedQueries.ts`
  `apps/parking-app-operator/lib/types.ts`
  `apps/parking-app-operator/tests/`
  `apps/parking-app-operator/README.md`
  `apps/parking-app-operator/PRODUCTION_READINESS_CHECKLIST.md`
  `workflow/logs/AI_DEVELOPER_EXECUTION_LOG.md`
  `workflow/planning/ACTIVE_EXECUTION_TRACKER.md`
  `workflow/runtime/AI_WORKFLOW_STATE.md`

- `Reviewer focus areas`:
  Verify the new customer oversight surface is admin-only, read-only, and does not leak global customer data to non-admin roles.
  Verify the implementation uses real current repo data rather than placeholder claims, especially for customer identity and dashboard-access overlap.
  Verify navigation changes stay narrowly grouped with the admin control plane and do not disturb the accepted operational-first non-admin experience.
  Verify docs and tests describe both the new visibility and any remaining data limitations truthfully.

- `Next owner after developer closeout`:
  `Reviewer`
