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

### 2026-06-25 - Add Dashboard Auth-User Onboarding From Access Control

- `Objective`:
  Implement the next Track K repo slice by letting admins onboard a new dashboard user from `Access Control` without requiring that Supabase Auth account to already exist, while preserving the accepted role-assignment, lot-assignment, and location-scoping behavior.

- `Why now`:
  The current Track K foundation and the `Manage Parking Lots` separation slice are accepted. The highest-priority remaining repo-executable gap is the onboarding limitation explicitly called out in the accepted review, tracker, README, and readiness checklist: `Access Control` can currently grant a dashboard role only after a Supabase Auth user already exists.

- `In scope`:
  Audit the current `Access Control` page, `/api/operator/dashboard-accounts` route, request schemas, admin helpers, and related docs before editing.
  Extend the admin-only dashboard-account provisioning flow so an admin can onboard a new dashboard user by email through a server-side Supabase Admin API path instead of stopping at the current "existing Auth user only" limitation.
  Prefer an invitation-based onboarding path that keeps password delivery and account acceptance in Supabase-owned flows rather than inventing local password handling.
  Preserve the existing ability to grant or update a dashboard role for an already-existing Supabase Auth user.
  Keep the role write to `admin_user_roles` server-side and audit-backed, and make the UI explicit about whether the action invited a new Auth user or updated an existing one.
  Keep `Access Control` admin-only and preserve the accepted operator-to-lot assignment flow and non-admin assigned-location scoping.
  Update operator docs and readiness wording so they truthfully describe the new onboarding capability and any remaining limits, including staging proof and bootstrap-admin follow-up.
  Add focused tests for the new route or helper behavior, the request schema, the admin-only UI contract, and honest copy around what is and is not automated now.

- `Out of scope`:
  Do not implement MFA, password reset UX, profile editing, or a full account-management console in this slice.
  Do not claim live Supabase proof, email deliverability proof, or production-ready invitation operations in this cycle.
  Do not replace the current `admin@example.com` bootstrap-admin convention with a final production-safe bootstrap model in this slice.
  Do not broaden into customer-oversight tooling, admin analytics, payment work, exit authorization, or unrelated operator-surface redesign.
  Do not reopen the accepted `Manage Parking Lots` or selected-lot `Parking Setup` behavior except for the narrowest incidental copy cleanup if it is trivial and directly touched.

- `Dependencies to respect`:
  `MASTER_PRODUCTION_PLAN.md` and `ACTIVE_EXECUTION_TRACKER.md` still place Track K ahead of lower-priority repo work.
  The accepted Track K review explicitly says dashboard-role provisioning still assumes the target Supabase Auth user already exists.
  Existing dashboard access is still granted only through `admin_user_roles`; preserve that model.
  Existing assignment security depends on exact `operator_location_assignments` checks before privileged mutation; preserve that model untouched.
  The debugger note about rerunnable `admin_hardening.sql` matters to staging sequencing, but it is a manual follow-up unless this onboarding slice truly touches that SQL.

- `Constraints`:
  Keep all privileged auth-user onboarding work server-side only.
  Prefer the Supabase Admin invite flow rather than hand-rolled password creation or local credential generation.
  Make the UI and docs honest that invitation-based onboarding still needs non-production Supabase proof and does not replace the broader bootstrap-admin decision.
  Preserve the distinction between customer mobile users and dashboard accounts; do not imply that customer accounts automatically become dashboard users.
  Keep the slice narrow enough for one reviewable cycle centered on dashboard auth-user onboarding from the existing `Access Control` surface.

- `Required validation`:
  Run `npm --workspace apps/parking-app-operator run test`.
  Run `npm --workspace apps/parking-app-operator run build`.
  Run `git diff --check`.
  Statically verify admin-only route enforcement, the preserved existing-user provisioning path, the new onboarding path, the continued `admin_user_roles` gate, and the absence of widened non-admin permissions.
  If no non-production Supabase target is available, state clearly that invitation delivery and live onboarding proof remain manual follow-ups.

- `Success criteria`:
  An admin can initiate dashboard-user onboarding from `Access Control` without first creating the Supabase Auth account manually.
  The existing "grant role to an already-existing Auth user" behavior still works and is not regressed.
  The route remains admin-only, server-side, and audit-backed.
  Non-admin location scoping and accepted lot-management behavior remain intact.
  Docs and tests truthfully describe the new onboarding capability and the remaining staging or bootstrap limitations.

- `Expected deliverable`:
  A focused Track K repo slice covering server-side dashboard auth-user onboarding, matching `Access Control` UI updates, truthful docs and tests, any narrow helper or schema additions required, and baton handoff to Reviewer.

- `Files likely involved`:
  `apps/parking-app-operator/app/api/operator/dashboard-accounts/route.ts`
  `apps/parking-app-operator/app/dashboard/access-control/page.tsx`
  `apps/parking-app-operator/lib/operatorAdminAccess.ts`
  `apps/parking-app-operator/lib/operatorRouteSchemas.ts`
  `apps/parking-app-operator/README.md`
  `apps/parking-app-operator/PRODUCTION_READINESS_CHECKLIST.md`
  `apps/parking-app-operator/tests/routeContractCoverage.test.js`
  `apps/parking-app-operator/tests/routeRequestValidation.test.mjs`
  any focused helper or contract test files needed for the onboarding path
  `workflow/logs/AI_DEVELOPER_EXECUTION_LOG.md`
  `workflow/runtime/AI_WORKFLOW_STATE.md`

- `Reviewer focus areas`:
  Verify the onboarding route and UI stay admin-only and do not widen non-admin privileges.
  Verify the new onboarding path is server-side and keeps `admin_user_roles` as the actual dashboard access gate.
  Verify the existing-user role-provisioning path is preserved rather than replaced.
  Verify docs do not overclaim live invitation proof, email delivery guarantees, or production-safe bootstrap completion.
  Verify any incidental UI polish did not reopen the accepted lot-management surface separation.

- `Next owner after developer closeout`:
  `Reviewer`
