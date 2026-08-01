# Mobile Production Readiness Checklist

This app is now the React Native frontend baseline for the parking product.
It is the primary mobile app in the repository.

## Done

- [x] Expo Router app shell
- [x] Native screen flow for home, reservation, arrival, session, exit, and receipt
- [x] Persisted local flow state with Secure Store
- [x] Reusable parking-specific UI components
- [x] Base parking lot sample data and layout rendering
- [x] Dependency alignment for backend migration work
- [x] Supabase client/auth foundation
- [x] Live parking lot data loader with fallback support
- [x] Backend-aware reservation/session helper layer
- [x] Auth screen and login route
- [x] Notification scheduling and workflow recovery foundation
- [x] Receipt capture and save flow
- [x] Entry-pass-first reservation and walk-in UX that waits for backend gate/operator confirmation before session activation
- [x] Parking-grace session display based on backend session fields when available
- [x] Launch-critical reservation, arrival, session, and walk-in screens now use responsive padding, safer compact-state stacking, and less overflow-prone action layout for smaller phones
- [x] Payment, exit, receipt, menu, profile, and payment-method screens now have safer compact wrapping for fee rows, receipt metadata, action controls, wallet/card rows, and account fields

## In progress

- [ ] Replace the remaining sample-only UI assumptions with backend-first data
- [ ] Validate the gate-entry-first reservation, walk-in, session, payment, exit, and receipt journey on real Android hardware
- [ ] Capture live small-phone and tall-phone viewport proof for the responsive reservation, walk-in, payment, exit, receipt, menu, profile, and payment-method screens
- [ ] Add receipt sharing/export parity beyond local save
- [ ] Add payment backend integration
- [ ] Add route-level and device-level tests

## Next

- [ ] Remove stale slot-validation scanner expectations from production-facing copy and tests where gate-entry-first behavior is now canonical
- [ ] Replace prototype UI copy and placeholders with production-facing UX
- [ ] Add location-aware live refresh and realtime sync
- [ ] Add customer history, receipt archive, and notification preferences
- [ ] Connect payment and exit authorization UX to a real backend/payment provider contract
