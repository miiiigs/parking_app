# Suggestions And Improvements Log

This file is the manual backlog for user-requested improvements, minor adjustments, and ideas that the `Planner` should consider in future cycles.

Use this file for:

- non-bug improvements
- manual product ideas
- UX and workflow refinements
- small technical cleanup wishes
- future-cycle suggestions that should not be lost

## Lifecycle

- The user or a manual support pass can add suggestions here.
- The `Planner` should read this log before deciding the next cycle when suggestions may affect priority or scope.
- The `Planner` may keep, defer, absorb, or reject a suggestion in normal planning.
- The `Reviewer` may clear completed suggestions when they are fully accepted and no longer active.

## Status Values

- `Open`
- `Planner acknowledged`
- `Deferred`
- `Absorbed into brief`
- `Completed`
- `Rejected`

## Active Suggestions

### 2026-06-25 - Full UI/UX, Responsiveness, And Readability Hardening Pass

- `Suggestion summary`:
  Run a complete UI and UX hardening pass across the mobile app and the shared operator or admin webapp, focusing on responsiveness, readability, spacing, container sizing, and practical screen usability before deeper payment work continues in this workflow.
- `Why this would help`:
  The product now has meaningful functional depth, but the next serious quality risk is that some screens or pages may still feel cramped, overflow on smaller sizes, use text that is hard to read, or rely on layouts that are not yet production-comfortable for real users and operators.
- `Type`:
  `UX hardening and production-readiness improvement`
- `Affected area`:
  `mobile app`, `operator/admin webapp`, `shared UI patterns`, `responsive layout behavior`, and `release-readiness confidence`
- `Desired outcome`:
  Audit every important mobile screen and operator or admin page for:
  responsiveness on realistic device and browser sizes,
  readable font sizing and contrast,
  safe spacing and container sizing,
  no clipped, overlapping, or hidden actions,
  safe scroll behavior and keyboard behavior,
  and practical operator usability during real workflows.
  Fix the most important UI and UX issues in repo code rather than only documenting them.
  Keep payment implementation out of this workflow priority for now because payment direction will be handled in a separate React Native consultation.
- `Priority feeling`:
  `Highest`
- `Blocking or non-blocking`:
  `Blocking for the next planner cycle because this should become the immediate workflow focus before lower-priority polish or the deferred payment implementation work`
- `Extra notes or examples`:
  This should be treated as a real implementation and validation pass, not just a visual opinion review. The cycle should actively check mobile screens, operator/admin pages, overflow risk, unsafe text sizing, weak contrast, weak spacing, and layout breakage on smaller or tighter viewports.
- `Suggested planner interpretation`:
  Treat this as the next highest-priority automation brief.
  The most concrete next slice should likely be:
  1. inventory the launch-critical mobile screens and operator/admin pages that need review
  2. run a repo-backed responsiveness and readability audit
  3. fix the highest-severity layout, spacing, and legibility issues
  4. validate the changes with the right builds, tests, and screen checks
  5. leave payment implementation out of scope for this workflow slice until the separate payment consultation defines direction
- `Status`:
  `Absorbed into brief`

### 2026-06-24 - Admin Versus Operator Separation And Multi-Lot Control

- `Suggestion summary`:
  Reframe `parking-app-operator` as the shared admin and operator control app, then explicitly separate what admins can do versus what operators can do by account, role, and assigned parking-lot scope.
- `Why this would help`:
  The current operator assignment failure shows that location selection and operational authorization are still too manual and too easy to misunderstand. A clearer admin-versus-operator model with admin-managed assignments and visible multi-lot control is needed before the webapp can be trusted for real operations.
- `Type`:
  `Platform and operations improvement`
- `Affected area`:
  `operator/admin webapp`, `Supabase auth and role model`, `operator-location assignment flows`, `mobile/backend location parity`, and `seed/dev lot provisioning`
- `Desired outcome`:
  Keep `admin@example.com` as the current full-access bootstrap admin for non-production and make that account able to see and control the whole system.
  Distinguish dashboard accounts from customer mobile users and formalize whether shared identities are allowed.
  Let admins manage all parking lots, all operator assignments, and customer-facing oversight surfaces.
  Let operators act only within the parking lots they are explicitly assigned to.
  Add at least two more parking lots for easier end-to-end testing and make backend, operator, and mobile surfaces all reflect the same location set.
- `Clarified next-slice preference`:
  In the admin-side Access Control or an adjacent admin surface, add clean parking-lot management so admin can create and manage parking lots directly from the dashboard instead of relying on seed-only or manual backend setup.
  Add operator-account management so admin can create or provision dashboard operator accounts and then assign those operators to one or more parking lots.
  Ensure any admin-created or admin-managed parking lot changes reflect cleanly in the database and in the mobile app's available parking-lot list, not only inside the dashboard.
  Keep `Parking Setup` scoped to the currently selected parking lot only, rather than using it as the place for global lot creation.
  Add a new admin-only menu such as `Manage Parking Lots` for creating and managing parking-lot records across the whole system.
  For editing an existing managed parking lot, prefer a selected-lot dropdown card or dedicated selected-lot editor rather than reusing the `Create Parking Lot` container as the edit surface.
  Keep the operator-visible menu limited to operational pages only: `Dashboard`, `Live Reservations`, `Parking Actions`, `Parking Setup`, `Parking Map`, `Map Builder`, `Audit Trail`, and `Operator Tools` for reconciliation.
  Rename the current `Admin Tools` operator-facing entry to `Operator Tools` for non-admin use, while keeping admin-only control surfaces such as `Access Control` and `Manage Parking Lots` off the operator menu.
  Remove the location switcher for non-admin users because operators should work only within their single assigned parking lot.
  Improve the admin lot switcher UI so the dropdown is readable and clearly visible.
  Reorder the left navigation to: `Dashboard`, `Live Reservations`, `Parking Actions`, `Parking Setup`, `Parking Map`, `Map Builder`, `Audit Trail`, `Operator Tools`, then admin-only `Access Control` and `Manage Parking Lots`.
- `Priority feeling`:
  `Highest`
- `Blocking or non-blocking`:
  `Blocking for the next planner cycle because this now outranks the previously queued review/staging follow-ups`
- `Extra notes or examples`:
  This should likely produce a clearer admin control plane, explicit operator account provisioning or invitation rules, and a safer non-production bootstrap path that removes direct SQL dependence for day-to-day operator assignment.
- `Suggested planner interpretation`:
  Treat this as the next highest-priority planning brief. The most concrete next repo-executable slice should likely be:
  1. admin-only `Manage Parking Lots` navigation and global lot-management UI
  2. selected-lot-scoped `Parking Setup`
  3. selected-lot editing that does not reuse the create-lot container
  4. final operator/admin navigation, visibility, and location-switcher distinction
  5. admin lot-switcher readability improvements
  6. continued operator-account provisioning emphasis without duplicating already-tracked work
  7. clean backend and mobile parity for available lots
  Queue the current Parking Actions review, staging assignment rehearsal, exit-contract work, and other follow-ups after this identity-plus-multi-lot control slice.
- `Status`:
  `Absorbed into brief`

### 2026-06-23 - Operator Parking Actions With Entry And Exit QR Handling

- `Suggestion summary`:
  Add operator/admin-side Parking Actions that can process customer QR flows for lot entry and exit.
- `Why this would help`:
  This gives operators a clearer manual operations surface for real-world gate handling, fallback scanning, and guided progression into the next valid state without relying only on backend routes or hidden tooling.
- `Type`:
  `Product improvement`
- `Affected area`:
  `Operator dashboard`, `operator reservation detail flow`, `after-payment session flow`, and `gate entry/exit lifecycle`
- `Desired outcome`:
  Add a new operator/admin menu named `Parking Actions` with an `Entry Scan` action and an `Exit Scan` action.
  Let operators process user QR codes there.
  In the operator-side active reservation view and after-payment session view, add manual QR confirmation actions for valid entry and valid exit.
  Successful entry confirmation should move the user into an active session.
  Successful exit confirmation should move the user to the final receipt state.
- `Priority feeling`:
  `High`
- `Blocking or non-blocking`:
  `Non-blocking for the current approved review cycle, but a strong candidate for the next repo-executable planner brief`
- `Extra notes or examples`:
  This should likely build on the approved gate-entry API work and may become the first operator-facing scanner client slice tracked under the gate-entry and operator operations workstreams.
- `Suggested planner interpretation`:
  Consider this as a likely next-cycle candidate that connects the approved backend gate-entry contract to an operator-facing Parking Actions UI and extends the same operator flow thinking toward exit handling.
- `Status`:
  `Absorbed into brief`
