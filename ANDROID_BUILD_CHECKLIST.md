# Android Build Checklist

This project should be tested on a real Android device or emulator using the Expo native workflow, not Expo Go, for features like notifications and other native behavior.

## Recommended Flow

1. Install dependencies from the repository root.
2. Open Android Studio and copy the Android SDK Location from SDK Manager.
3. Create `apps/mobile/android/local.properties` with your SDK path, for example `sdk.dir=C:\Users\YourName\AppData\Local\Android\Sdk`.
4. Enable USB debugging on the Android phone if you want to test on a physical device.
5. Start the mobile app from the workspace root with the native Android path.
6. Install the generated app on the device or run it in an emulator.
7. Verify the full mobile flow on-device:
   - reserve a slot
   - scan the QR code
   - start the parking session
   - end the session
   - restart the app and confirm recovery
   - confirm notification behavior in the build

## Development Commands

- Native Android test build: `npm --workspace apps/mobile run android`
- Expo web or basic UI testing only: `npm --workspace apps/mobile run start`

If the SDK path is set correctly, `npm --workspace apps/mobile run android` should launch the local Android build.

## Release Commands

- Android production build with EAS: `npm --workspace apps/mobile run build:android`
- iOS production build with EAS: `npm --workspace apps/mobile run build:ios`

## What To Check Before Release

- Reservation and session state survive app restart.
- Notification reminders behave correctly in the Android build.
- Fallback/offline messages are clear when Supabase is unavailable.
- QR validation and session end still work on a real device.

## Notes

- Expo Go is fine for basic UI checks, but it is not the right target for native notification testing on this setup.
- Keep the mobile app on Expo, and use native builds for device-level validation and store release artifacts.
- If you ever see `SDK location not found`, open Android Studio, copy the SDK Location from SDK Manager, and put it into `apps/mobile/android/local.properties` as `sdk.dir=...`.