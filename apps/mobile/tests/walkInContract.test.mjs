import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

test('walk-in entry pass rpc derives identity and source on the server', () => {
  const source = readSource('../../../supabase/issue_walk_in_entry_pass.sql');

  assert.equal(source.includes('auth.uid()'), true);
  assert.equal(source.includes("'walk_in'"), true);
  assert.equal(source.includes('p_user_id'), false);
  assert.equal(source.includes('You already have an active walk-in entry pass'), true);
  assert.equal(source.includes("'scope', 'multi_location'"), true);
  assert.equal(source.includes('grant execute on function issue_walk_in_entry_pass(text, integer)'), true);
});

test('mobile walk-in contract uses backend issuance and observes gate-created sessions', () => {
  const source = readSource('../src/lib/reservations.ts');

  assert.equal(source.includes("supabase.rpc('issue_walk_in_entry_pass'"), true);
  assert.equal(source.includes("supabase.rpc('start_walk_in_session'"), false);
  assert.equal(source.includes('getParkingSessionByReservationId'), true);
  assert.equal(source.includes('await ensureMobileAuthSession();'), true);
});

test('walk-in entry pass flow no longer routes through slot-qr validation', () => {
  const screenSource = readSource('../src/features/parking/screens/WalkInQrScreen.tsx');
  const storeSource = readSource('../src/features/parking/store/useParkingFlowStore.ts');

  assert.equal(screenSource.includes("router.push('/validate')"), false);
  assert.equal(screenSource.includes('Session starts automatically when the timer reaches 00:00.'), false);
  assert.equal(screenSource.includes('Check Gate Confirmation'), true);
  assert.equal(screenSource.includes('scan the QR posted at your parked slot'), false);
  assert.equal(screenSource.includes('Any supported parking lot'), true);
  assert.equal(storeSource.includes('startWalkInSession: async'), false);
  assert.equal(storeSource.includes('refreshSession: async'), true);
  assert.equal(storeSource.includes('clearExpiredEntryPass: async'), true);
  assert.equal(screenSource.includes('await clearExpiredEntryPass()'), true);
});

test('walk-in expiry cleanup is locked, idempotent, inventory-safe, and audit-backed', () => {
  const source = readSource('../../../supabase/expire_stale_walk_in_entry_passes.sql');

  assert.equal(source.includes("r.source = 'walk_in'"), true);
  assert.equal(source.includes("r.status = 'confirmed'"), true);
  assert.equal(source.includes('r.expires_at <= now()'), true);
  assert.equal(source.includes('for update of r skip locked'), true);
  assert.equal(source.includes('from parking_sessions s'), true);
  assert.equal(source.includes("s.status in ('active', 'disputed')"), true);
  assert.equal(source.includes("r.id <> v_reservation.id"), true);
  assert.equal(source.includes("'walk_in_entry_pass_expired'"), true);
  assert.equal(source.includes("'slot_released', v_slot_released"), true);
  assert.equal(source.includes('grant execute on function expire_stale_walk_in_entry_passes() to service_role'), true);
  assert.equal(source.includes('grant execute on function expire_stale_walk_in_entry_passes() to anon'), false);
});

test('walk-in expiry scheduler is opt-in and has an explicit rollback', () => {
  const source = readSource('../../../supabase/schedule_walk_in_expiry_cleanup.sql');

  assert.equal(source.includes("extname = 'pg_cron'"), true);
  assert.equal(source.includes("'expire-stale-walk-in-entry-passes'"), true);
  assert.equal(source.includes("'* * * * *'"), true);
  assert.equal(source.includes("select public.expire_stale_walk_in_entry_passes();"), true);
  assert.equal(source.includes("cron.unschedule('expire-stale-walk-in-entry-passes')"), true);
});
