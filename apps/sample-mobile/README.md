# ParkEasy Sample Mobile

Native rewrite of the original `apps/sample-mobile` Vite prototype.

## Stack

- Expo SDK 52
- Expo Router file-based navigation
- React Native + TypeScript
- Zustand persisted with Expo Secure Store
- `react-native-svg` for the parking map and QR-style cards

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

- The flow is prototype-safe and persists booking/session state across relaunches.
- Bundle identifiers in `app.json` are placeholders and should be replaced before store submission.
- `eas.json` is included so the app can move to internal and production builds without changing structure.
