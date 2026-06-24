# ParkEasy Mobile

React Native / Expo frontend baseline for the parking product.
This is the primary mobile app in the repository.

## Stack

- Expo SDK 52
- Expo Router file-based navigation
- React Native + TypeScript
- Zustand persisted with Expo Secure Store
- `react-native-svg` for the parking map and QR-style cards

## Current role

- main frontend basis for the mobile app
- Expo Router app shell for reservation, gate-entry waiting, session, exit, and receipt flows
- Supabase-backed auth/data foundation for live backend testing
- native notification scheduling and saved-workflow recovery foundation

## Run

1. `npm install`
2. `npm --workspace apps/mobile run start`
3. `npm --workspace apps/mobile run android` or `npm --workspace apps/mobile run ios`

## Structure

- `app/` route entrypoints for Expo Router
- `src/features/parking/` booking flow, domain data, and persisted store
- `src/components/` reusable UI and parking-specific native components
- `src/theme/` design tokens and shared visual constants

## Notes

- The flow still falls back to local sample data when live backend data is unavailable.
- The current bundle identifiers in `app.json` are usable repo defaults, but the final production identifiers should still be confirmed before store submission.
- `eas.json` is included so the app can move to internal and production builds without changing structure.
- See [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) for the current migration status.
