# Sample Mobile Production Readiness Checklist

This app is now the React Native frontend baseline for the parking product.
It is the target for migrating the mature backend-connected flows from `apps/mobile`.

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

## In progress

- [ ] Replace the remaining sample-only UI assumptions with backend-first data
- [ ] Port QR validation and receipt capture/share flows from `apps/mobile`
- [ ] Port notification scheduling and recovery flows from `apps/mobile`
- [ ] Add payment backend integration
- [ ] Add route-level and device-level tests

## Next

- [ ] Build the backend contract for reservations, sessions, and payments
- [ ] Replace prototype UI copy and placeholders with production-facing UX
- [ ] Add location-aware live refresh and realtime sync
- [ ] Port mobile workflow recovery and notification scheduling logic
