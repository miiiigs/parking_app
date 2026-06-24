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
