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

## PayMongo Test Setup

1. Add your PayMongo public test key to `apps/mobile/.env`:
   `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_...`
2. Set your PayMongo secret test key for the deployed Supabase Edge Function:
   `npx supabase secrets set PAYMONGO_SECRET_KEY=sk_test_...`
3. Deploy the payment function:
   `npx supabase functions deploy paymongo-checkout`
4. Restart the Expo dev server after changing `.env` so the app picks up the public key.

## Current Payment Flow

- Cards use PayMongo Payment Intents and stay inside the app unless PayMongo or the issuing bank requires 3DS authentication.
- GCash and Maya still open their approval flow outside the app, then return to the payment screen.
- QR Ph generates inside the app, can be scanned by a wallet or banking app, and can also be saved to photos for testing.
- For production, register PayMongo webhooks for `payment.paid` and `payment.failed` so paid sessions can be confirmed server-to-server.

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
