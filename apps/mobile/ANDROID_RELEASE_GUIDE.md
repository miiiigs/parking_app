# Android Release Guide

This project has two Android release lanes:

1. Local tester APK for real-device QA and stakeholder demos
2. Production AAB for Google Play testing tracks and store release

Use the tester lane when you want a directly installable APK without an Expo login.
Use the production lane when you want the professional store artifact and proper signing.

## Daily development

- Run the native app locally: `npm run android`
- Use this for feature work and debugging on an emulator or USB-connected device.
- This is the safest way to verify native behavior such as notifications, storage, media access, and app restarts.

## Tester APK

Build a release-mode APK signed with the debug key:

```powershell
npm run build:android:tester
```

Output:

- `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

Notes:

- This build is intended for local testing, QA, and stakeholder review.
- It does not require an Expo login.
- It is not the artifact you should upload to Google Play.
- Android devices may require "Install unknown apps" permission before the APK can be installed.

## Production Android build

Production builds should use a real upload keystore and produce an Android App Bundle:

```powershell
npm run build:android:bundle
```

Output:

- `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`

The production build will now fail if release signing is not configured. This is intentional and prevents accidental debug-signed store builds.

## One-time production signing setup

1. Generate an upload keystore:

```powershell
keytool -genkey -v -keystore upload-keystore.jks -alias parking-upload -keyalg RSA -keysize 2048 -validity 10000
```

2. Move the keystore to:

- `apps/mobile/android/app/upload-keystore.jks`

3. Copy the template file:

- `apps/mobile/android/keystore.properties.example`

4. Create:

- `apps/mobile/android/keystore.properties`

5. Fill in the real values:

```properties
storeFile=app/upload-keystore.jks
storePassword=your-keystore-password
keyAlias=parking-upload
keyPassword=your-key-password
```

6. Keep both files private:

- Never commit `upload-keystore.jks`
- Never commit `keystore.properties`
- Back up the keystore and passwords in your team's secure password manager

## Recommended distribution flow

For this project, the conventional Android path is:

1. Verify features locally with `npm run android`
2. Hand testers a local APK from `npm run build:android:tester`
3. Create a signed AAB with `npm run build:android:bundle`
4. Upload the AAB to Google Play Internal Testing
5. Promote to Closed Testing
6. Release to Production only after end-to-end validation

## Optional EAS cloud builds

If you want cloud-hosted artifacts and share links later, this repo still supports EAS:

- Internal APK build: `npm run build:android:apk`
- Production cloud build: `npm run build:android`

EAS is useful for team distribution, but it requires Expo account setup. Local tester and local production builds do not.

## Release checklist

Before any tester or production build:

- Confirm reservation, arrival, session, exit, and receipt flows on a real device
- Verify notifications in a native Android build
- Verify app restart and recovery behavior
- Verify Supabase connectivity and offline fallback behavior
- Increment Android versioning before a Play upload
- Keep package name stable unless intentionally creating a separate app variant

## Versioning reminders

This project currently exposes:

- Android package: `com.parking.mobile`
- Android versionName: `1.0.0`
- Android versionCode: `1`

Before every Play upload:

- Increase `versionCode` in `apps/mobile/android/app/build.gradle`
- Update `versionName` there if you want a new visible app version
- Keep the Expo app version in `apps/mobile/app.json` aligned with the release version
