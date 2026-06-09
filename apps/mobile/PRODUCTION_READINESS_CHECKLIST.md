# Parking Mobile Production Readiness Checklist

Last reassessed: 2026-06-09

## Completed In This Pass

- [x] Replace anonymous mobile auth with real customer email/password auth.
- [x] Add an auth provider and auth screen for sign in / sign up.
- [x] Move the mobile app entry to Expo Router instead of a single root shell.
- [x] Split the startup flow into route pages for home, reserve, validate, and session.
- [x] Extract shared workflow state into a provider instead of keeping it only in `App.tsx`.
- [x] Add a regression test to confirm the mobile auth path no longer uses anonymous sign-in.
- [x] Keep the mobile test suite and TypeScript build passing after the refactor.

## Still Open

### Auth and Accounts

- [ ] Add password reset and email confirmation handling in the customer auth flow.
- [ ] Add a customer profile or account screen.
- [ ] Add reservation/session history for the signed-in customer.

### Backend Integration

- [ ] Move payment confirmation and settlement authority fully server-side.
- [ ] Replace the client-side "mark as paid" end-session flow with a proper payment-backed flow.
- [ ] Add stronger server-side reservation/session status reconciliation for the mobile user.
- [ ] Add paginated history endpoints for past reservations, sessions, and receipts.

### Workflow Architecture

- [ ] Break the workflow provider into smaller hooks or stores if it grows further.
- [ ] Remove any remaining legacy reliance on the old monolithic `App.tsx` path.
- [ ] Add clearer state boundaries for auth, live dashboard sync, notifications, and parking actions.

### UI and UX

- [ ] Remove prototype or fallback wording from the primary consumer flow.
- [ ] Replace hardcoded placeholder values in the home/session summaries.
- [ ] Polish spacing, typography, and responsiveness on smaller devices.
- [ ] Add proper empty, loading, and error states for profile and history views.

### Notifications and Offline Recovery

- [ ] Harden push notification fallback behavior for production builds.
- [ ] Add clearer recovery states when backend data is stale or unavailable.
- [ ] Verify background refresh behavior on physical devices.

### Testing and Release Hygiene

- [ ] Add device-level flow testing for reserve -> validate -> session.
- [ ] Add release checks for Android and iOS build profiles.
- [ ] Add crash reporting and production analytics.
- [ ] Add a release checklist for store submission and backend environment setup.

## Validation Snapshot

- [x] `npx tsc -p apps/mobile/tsconfig.json --noEmit`
- [x] `npm --workspace apps/mobile run test`

## Suggested Next Features

- [ ] Customer reservation history.
- [ ] Account/profile management.
- [ ] Receipt archive and download/share history.
- [ ] Push notification preferences.
- [ ] Support/help flow with contact and issue reporting.
