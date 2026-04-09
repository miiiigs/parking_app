# Android Build Checklist

This project should be tested on a real Android device or emulator using the Expo native workflow, not Expo Go, for features like notifications and other native behavior.

## Recommended Flow

1. Install dependencies from the repository root.
2. Make sure Android Studio and the Android SDK are installed.
3. Enable USB debugging on the Android phone if you want to test on a physical device.
4. Start the mobile app from the workspace root with the native Android path.
5. Install the generated app on the device or run it in an emulator.
6. Verify the full mobile flow on-device:
   - reserve a slot
   - scan the QR code
   - start the parking session
   - end the session
   - restart the app and confirm recovery
   - confirm notification behavior in the build

## Development Commands

- Native Android test build: `npm --workspace apps/mobile run android`
- Expo web or basic UI testing only: `npm --workspace apps/mobile run start`
- If native Expo packages were added or changed, sync them to the current Expo SDK first: `npx expo install expo-notifications expo-secure-store expo-camera`

## Release Commands

- Android production build with EAS: `npm --workspace apps/mobile run build:android`
- iOS production build with EAS: `npm --workspace apps/mobile run build:ios`
- If `eas` is not installed globally, the scripts use `npx --yes eas-cli` automatically.

## If Android build fails with SDK location not found

Create `apps/mobile/android/local.properties` and set your SDK path, for example:

```properties
sdk.dir=C:\Users\YourName\AppData\Local\Android\Sdk
```

You can also set `ANDROID_HOME` or `ANDROID_SDK_ROOT` to the same SDK folder. The folder should contain `platform-tools`, `platforms`, and `build-tools`.

## What To Check Before Release

- Reservation and session state survive app restart.
- Notification reminders behave correctly in the Android build.
- Fallback/offline messages are clear when Supabase is unavailable.
- QR validation and session end still work on a real device.

## Notes

- Expo Go is fine for basic UI checks, but it is not the right target for native notification testing on this setup.
- Keep the mobile app on Expo, and use native builds for device-level validation and store release artifacts.
- If EAS warns that `android.package` is ignored, that is because the `android/` native project exists and its application id is being used instead.