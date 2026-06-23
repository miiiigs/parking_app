# Track A Environment And Release Baseline

This document rebuilds the current Track A operating baseline from committed repo reality.

Use it as the current reference for:

- environment separation
- environment variable ownership
- Supabase bootstrap and migration sequencing
- rollback posture
- mobile and operator release flow
- remaining manual gaps before Track A can be declared fully closed

This baseline does not replace the wider product roadmap in [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md).

## Source Evidence

- [apps/mobile/.env.example](../apps/mobile/.env.example)
- [apps/parking-app-operator/.env.example](../apps/parking-app-operator/.env.example)
- [apps/mobile/package.json](../apps/mobile/package.json)
- [apps/parking-app-operator/package.json](../apps/parking-app-operator/package.json)
- [package.json](../package.json)
- [apps/mobile/eas.json](../apps/mobile/eas.json)
- [apps/mobile/app.json](../apps/mobile/app.json)
- [apps/mobile/android/app/build.gradle](../apps/mobile/android/app/build.gradle)
- [apps/mobile/ANDROID_RELEASE_GUIDE.md](../apps/mobile/ANDROID_RELEASE_GUIDE.md)
- [ANDROID_BUILD_CHECKLIST.md](../ANDROID_BUILD_CHECKLIST.md)
- [apps/mobile/PRODUCTION_READINESS_CHECKLIST.md](../apps/mobile/PRODUCTION_READINESS_CHECKLIST.md)
- [apps/mobile/README.md](../apps/mobile/README.md)
- [apps/parking-app-operator/PRODUCTION_READINESS_CHECKLIST.md](../apps/parking-app-operator/PRODUCTION_READINESS_CHECKLIST.md)
- [apps/parking-app-operator/README.md](../apps/parking-app-operator/README.md)
- [supabase/README.md](../supabase/README.md)
- [supabase/schema.sql](../supabase/schema.sql)
- [supabase/enable_rls.sql](../supabase/enable_rls.sql)
- [supabase/admin_hardening.sql](../supabase/admin_hardening.sql)
- [supabase/bootstrap_admin_role.sql](../supabase/bootstrap_admin_role.sql)
- [supabase/parking_lot_layouts.sql](../supabase/parking_lot_layouts.sql)
- [supabase/mobile_dashboard_snapshot.sql](../supabase/mobile_dashboard_snapshot.sql)
- [supabase/location_pricing_support.sql](../supabase/location_pricing_support.sql)
- [supabase/parking_rate_support.sql](../supabase/parking_rate_support.sql)
- [supabase/user_vehicles.sql](../supabase/user_vehicles.sql)
- [supabase/update_reservations_status_constraint.sql](../supabase/update_reservations_status_constraint.sql)
- [supabase/reserve_parking_slot.sql](../supabase/reserve_parking_slot.sql)
- [supabase/cancel_parking_reservation.sql](../supabase/cancel_parking_reservation.sql)
- [supabase/start_parking_session.sql](../supabase/start_parking_session.sql)
- [supabase/end_parking_session.sql](../supabase/end_parking_session.sql)
- [supabase/issue_walk_in_entry_pass.sql](../supabase/issue_walk_in_entry_pass.sql)
- [supabase/start_walk_in_session.sql](../supabase/start_walk_in_session.sql)
- [supabase/expire_stale_walk_in_entry_passes.sql](../supabase/expire_stale_walk_in_entry_passes.sql)
- [supabase/schedule_walk_in_expiry_cleanup.sql](../supabase/schedule_walk_in_expiry_cleanup.sql)
- [supabase/walk_in_support.sql](../supabase/walk_in_support.sql)
- [supabase/enable_realtime.sql](../supabase/enable_realtime.sql)
- [supabase/seed.sql](../supabase/seed.sql)
- [supabase/reset_demo_state.sql](../supabase/reset_demo_state.sql)
- [supabase/reset_parking_slots.sql](../supabase/reset_parking_slots.sql)
- [supabase/backup_restore_smoke_test.sql](../supabase/backup_restore_smoke_test.sql)

## Environment Matrix

| Environment | Purpose | App posture | Data posture | Release posture |
| --- | --- | --- | --- | --- |
| `local` | Daily engineering work | Mobile runs through Expo and native local builds. Operator runs through Next.js dev. | Safe for seed data, resets, and destructive local experiments. | Fast iteration. No production secrets. |
| `staging` | Integration rehearsal and rollout practice | Mobile and operator should use live Supabase credentials for a non-production project. | Safe place for bootstrap rehearsal, migration rehearsal, restore drill, and end-to-end validation. | First place to prove a clean setup and rollback path. |
| `pilot-production` | Controlled live launch at limited scope | Same deployment shape as production, but with tightly controlled users and operators. | Real operational data with strong manual oversight. | Use only after staging bootstrap and rollback are proven. |
| `production` | Commercial release | Stable mobile artifacts and operator deployment only. | Real customer and operator data. No seed or reset scripts. | Changes should be deliberate, reversible, and validated first in staging or pilot. |

## Environment Variable Inventory

### Mobile app

Current committed mobile env template:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Current posture:

- These values are public client values and are expected in the mobile runtime.
- The mobile app fails backend-connected actions when these keys are missing.
- The mobile README still says bundle identifiers are placeholders, while the committed app config currently uses `com.parking.mobile`. Confirm the final production identifier before store submission instead of assuming the current value is final.

### Operator app

Current committed operator env template:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Current posture:

- `NEXT_PUBLIC_*` values are expected on both client and server paths.
- `SUPABASE_SERVICE_ROLE_KEY` is required for scoped operational writes through server routes and must remain server-side only.
- Operator code also accepts `SUPABASE_URL` as a fallback server variable in some server files, but this is not the primary documented contract.

### Shared environment rules

- Do not commit real Supabase secrets or keystore credentials.
- Mobile should only receive public anon credentials.
- Operator service-role credentials must be provisioned manually in the deployment platform.
- `NODE_ENV=production` changes operator runtime behavior for cookies and analytics and is also set by the Android production build helper.

## Local Development Commands

From the repo root:

- `npm run dev:mobile`
- `npm run dev:operator`
- `npm run test:mobile`
- `npm run test:operator`
- `npm run typecheck:mobile`
- `npm run android`
- `npm run ios`

Mobile workspace release-related commands:

- `npm --workspace apps/mobile run build:android:tester`
- `npm --workspace apps/mobile run build:android:tester:universal`
- `npm --workspace apps/mobile run build:android:bundle`
- `npm --workspace apps/mobile run build:android:apk`
- `npm --workspace apps/mobile run build:android`
- `npm --workspace apps/mobile run build:ios`

Operator workspace release-related commands:

- `npm --workspace apps/parking-app-operator run build`
- `npm --workspace apps/parking-app-operator run test`

## Mobile Release Baseline

The repo currently supports two Android release lanes plus optional EAS cloud builds.

### Daily native validation

- `npm run android`
- `npm run ios`

Use these first for feature work and native behavior checks.

### Tester APK lane

- Command: `npm run build:android:tester`
- Output: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
- Purpose: real-device QA and stakeholder demo distribution
- Signing posture: debug key only

### Production Android lane

- Command: `npm run build:android:bundle`
- Output: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`
- Purpose: Google Play testing tracks and production submission
- Signing posture: requires real release signing configuration

### Optional EAS lane

- Internal APK: `npm run build:android:apk`
- Cloud production Android: `npm run build:android`
- Cloud production iOS: `npm run build:ios`

EAS is configured in [apps/mobile/eas.json](../apps/mobile/eas.json) with `development`, `preview`, `apk`, and `production` profiles.

### Current versioning evidence

- Android package: `com.parking.mobile`
- Android `versionName`: `1.0.0`
- Android `versionCode`: `1`

Before a real store upload:

- increase `versionCode`
- align `versionName`
- align the Expo app version
- confirm the final package or bundle identifier
- confirm real-device notification, reservation, arrival, session, exit, and receipt flows

### Signing and secret ownership

Manual release secrets still required:

- `apps/mobile/android/app/upload-keystore.jks`
- `apps/mobile/android/keystore.properties`

These are intentionally not committed and must be provisioned, backed up, and controlled outside the repo.

## Operator Deployment Baseline

The operator app is currently designed around a standard Next.js deployment.

Current documented deployment posture:

- set the deployment root directory to `apps/parking-app-operator`
- use the normal install command `npm install`
- use the build command `npm run build`
- provision Supabase credentials securely
- confirm `admin_user_roles` includes every allowed operator account
- confirm at least one `locations` row exists
- validate realtime connectivity and fallback polling behavior
- verify role behavior for `admin`, `operator`, `support`, and `finance`

Release gate before promotion:

- `npm --workspace apps/parking-app-operator run test`
- `npm --workspace apps/parking-app-operator run build`

## Supabase Bootstrap And Migration Baseline

The repo does not currently include an automated migration runner or CI migration pipeline.

Current operating posture is file-driven and manual, so the safest rule is:

- treat all SQL application as deliberate environment work
- apply destructive helpers only in local or controlled non-production contexts
- take a backup or snapshot before non-trivial environment changes

### Fresh environment bootstrap sequence

Recommended current sequence for a brand-new Supabase project:

1. Run [schema.sql](../supabase/schema.sql).
2. Run [enable_rls.sql](../supabase/enable_rls.sql) as an explicit hardening rerun for the core tables.
3. Run [admin_hardening.sql](../supabase/admin_hardening.sql).
   Then run [operator_location_assignments.sql](../supabase/operator_location_assignments.sql) and provision explicit operator/location assignments before enabling gate mutations.
4. After the first real operator auth user exists, run [bootstrap_admin_role.sql](../supabase/bootstrap_admin_role.sql) with the real admin email substituted.
5. Run [parking_lot_layouts.sql](../supabase/parking_lot_layouts.sql).
6. Run [mobile_dashboard_snapshot.sql](../supabase/mobile_dashboard_snapshot.sql).
7. Run the domain support or compatibility files that the target environment still needs:
   - [location_pricing_support.sql](../supabase/location_pricing_support.sql)
   - [parking_rate_support.sql](../supabase/parking_rate_support.sql)
   - [user_vehicles.sql](../supabase/user_vehicles.sql)
   - [update_reservations_status_constraint.sql](../supabase/update_reservations_status_constraint.sql)
   - [walk_in_support.sql](../supabase/walk_in_support.sql)
8. Run the reservation, session, and walk-in RPC files that the environment needs to match current app behavior:
   - [reserve_parking_slot.sql](../supabase/reserve_parking_slot.sql)
   - [cancel_parking_reservation.sql](../supabase/cancel_parking_reservation.sql)
   - [start_parking_session.sql](../supabase/start_parking_session.sql)
   - [confirm_parking_entry.sql](../supabase/confirm_parking_entry.sql)
   - [end_parking_session.sql](../supabase/end_parking_session.sql)
   - [issue_walk_in_entry_pass.sql](../supabase/issue_walk_in_entry_pass.sql)
   - [start_walk_in_session.sql](../supabase/start_walk_in_session.sql)
9. Run [expire_stale_walk_in_entry_passes.sql](../supabase/expire_stale_walk_in_entry_passes.sql).
10. Run [enable_realtime.sql](../supabase/enable_realtime.sql).
11. Only for local or non-production seed scenarios, run [seed.sql](../supabase/seed.sql).
12. After staging validation and explicit `pg_cron` enablement, run [schedule_walk_in_expiry_cleanup.sql](../supabase/schedule_walk_in_expiry_cleanup.sql). Keep scheduler activation separate from schema bootstrap and verify the job in the target environment.

Notes:

- Some support files overlap functionality already present in `schema.sql`. Treat them as compatibility or incremental upgrade files when reconciling an older environment to current repo behavior.
- `parking_lot_layouts.sql` and `mobile_dashboard_snapshot.sql` are both required for the operator lot builder and the mobile lot layout payload.
- `enable_realtime.sql` currently adds `parking_slots`, `reservations`, `parking_sessions`, and `payments` to the `supabase_realtime` publication.
- `schedule_walk_in_expiry_cleanup.sql` is an environment activation artifact, not proof that the recurring job is active. Verify `cron.job`, `cron.job_run_details`, and emitted operator events in staging before promotion.

### Upgrade posture for existing environments

For an environment that already exists:

- do not replay destructive helpers blindly
- compare the target database state against the file intent
- apply only the missing compatibility files and RPC updates
- rerun or update downstream functions when a dependency file changes, especially the mobile snapshot or session or reservation RPC set

## Backup, Restore, Seed, And Reset Policy

### Safe in local and non-production only

- [seed.sql](../supabase/seed.sql)
- [reset_demo_state.sql](../supabase/reset_demo_state.sql)
- [reset_parking_slots.sql](../supabase/reset_parking_slots.sql)

Current intent from the files:

- `seed.sql` inserts a `BGC Pilot Site` location and twenty initial parking slots.
- `reset_demo_state.sql` deletes operational rows and is destructive.
- `reset_parking_slots.sql` marks all slots as `available` and updates timestamps.

These files should not be treated as production operations.

### Restore verification

After restoring a database backup or snapshot:

1. Run [backup_restore_smoke_test.sql](../supabase/backup_restore_smoke_test.sql).
2. Verify counts for `locations`, `parking_slots`, `reservations`, `parking_sessions`, `payments`, `admin_audit_log`, and `reconciliation_runs`.
3. Run reconciliation before operators resume work if slot or session state might have drifted.

## Rollback Baseline

### Database rollback

Current safest rollback posture:

1. Take a fresh backup or platform snapshot before applying non-trivial SQL changes.
2. If a change fails functionally, restore the prior snapshot rather than improvising ad hoc reverse SQL under pressure.
3. Run [backup_restore_smoke_test.sql](../supabase/backup_restore_smoke_test.sql) after restore.
4. Re-run reconciliation if operational state may be inconsistent after restore.
5. If the walk-in cleanup schedule must be rolled back independently, run `select cron.unschedule('expire-stale-walk-in-entry-passes');`.

### App rollback

- Mobile should promote builds gradually: local native validation, tester APK, then production AAB or EAS promotion.
- Operator deployment should retain the ability to roll back to the prior known-good deployment revision in the hosting platform.
- Do not couple a production app rollout to untested Supabase changes. Prove the schema and RPC set in staging first.

## Release Ownership Baseline

- `Backend` plus `DevOps`: own Supabase bootstrap order, migration execution, backups, restore posture, and secret provisioning.
- `Mobile` plus `QA/Release`: own native validation, Android and iOS artifact creation, version increments, and store-readiness checks.
- `Operator` plus `Backend`: own operator deployment checks, role verification, realtime health verification, and location-scoped operational readiness.

## Remaining Manual Gaps

Track A is materially rebuilt, but not fully closed yet.

Manual or external work still required:

- create and protect real Supabase credentials per environment
- create and protect the Android upload keystore and `keystore.properties`
- perform one clean `staging` bootstrap using this sequence against a non-production Supabase project
- perform one rollback drill using a real non-production backup or snapshot
- confirm the final production mobile package or bundle identifiers before store release
- decide and document the exact production host or hosts for the operator app if that deployment target changes from the current documented Next.js posture
- enable and observe the walk-in expiry scheduler in staging before promoting it to pilot-production

## Current Track A Closure Standard

Track A should not be declared fully done until:

- this baseline stays consistent with repo reality
- staging bootstrap has been rehearsed successfully
- rollback has been rehearsed successfully
- the manual secret and signing prerequisites are actually provisioned in the real target environments
