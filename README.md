# Smart Parking Reservation System

Monorepo scaffold for the Smart Parking Reservation System startup idea.

## Structure

- `apps/mobile` - React Native app for drivers
- `apps/parking-app-operator` - Next.js operator and admin dashboard for lot operations
- `packages/shared` - shared TypeScript types
- `supabase` - backend planning and schema notes

## Next build step

1. Keep the mobile app on Expo, but use `expo run:android` for local native testing and EAS builds for release instead of Expo Go for native features.
2. Define the Supabase schema.
3. Implement reservation, validation, session state flows.
4. Wire payment and notification events.
5. Add store-build configuration for Android and iOS.
6. Follow the Android build checklist in [ANDROID_BUILD_CHECKLIST.md](ANDROID_BUILD_CHECKLIST.md).
