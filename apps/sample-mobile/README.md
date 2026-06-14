# ParkEasy Sample Mobile

React Native / Expo frontend baseline for the parking product.
This is the app that will absorb the mature mobile backend flows from `apps/mobile`.

## Stack

- Expo SDK 52
- Expo Router file-based navigation
- React Native + TypeScript
- Zustand persisted with Expo Secure Store
- `react-native-svg` for the parking map and QR-style cards

## Current role

- main frontend basis for the mobile app
- local prototype flow preserved for now
- migration target for Supabase auth, QR validation, notifications, receipts, and payment integrations
- now has a Supabase-backed auth/data foundation for live backend testing

## Run

1. `npm install`
2. `npm --workspace apps/sample-mobile run start`
3. `npm --workspace apps/sample-mobile run android` or `npm --workspace apps/sample-mobile run ios`

## Structure

- `app/` route entrypoints for Expo Router
- `src/features/parking/` booking flow, domain data, and persisted store
- `src/components/` reusable UI and parking-specific native components
- `src/theme/` design tokens and shared visual constants

## Notes

- The flow still uses local sample data until backend migration is completed.
- Bundle identifiers in `app.json` are placeholders and should be replaced before store submission.
- `eas.json` is included so the app can move to internal and production builds without changing structure.
- See [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) for the current migration status.
