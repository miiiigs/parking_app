import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

test('reservation contract no longer exposes client-supplied user identity or reservation fee', () => {
  const source = readSource('../src/lib/reservations.ts');

  assert.equal(source.includes('p_user_id'), false);
  assert.equal(source.includes('p_reservation_fee'), false);
});

test('mobile observes backend-created sessions and does not call customer session-start rpc', () => {
  const source = readSource('../src/lib/reservations.ts');
  const storeSource = readSource('../src/features/parking/store/useParkingFlowStore.ts');

  assert.equal(source.includes('await ensureMobileAuthSession();'), true);
  assert.equal(source.includes("supabase.rpc('start_parking_session'"), false);
  assert.equal(source.includes("supabase.rpc('start_walk_in_session'"), false);
  assert.equal(source.includes("supabase.rpc('end_parking_session'"), true);
  assert.equal(storeSource.includes('getParkingSessionByReservationId'), true);
  assert.equal(storeSource.includes('refreshSession: async'), true);
  assert.equal(storeSource.includes('startSession: async'), false);
});

test('reservation arrival uses the entry pass flow and no longer requires slot-qr validation', () => {
  const arrivalSource = readSource('../src/features/parking/screens/ArrivalScreen.tsx');
  const validateSource = readSource('../app/validate.tsx');

  assert.equal(arrivalSource.includes("router.push('/validate')"), false);
  assert.equal(arrivalSource.includes('Scan Assigned Slot QR'), false);
  assert.equal(arrivalSource.includes('Check Gate Confirmation'), true);
  assert.equal(arrivalSource.includes('reservation-entry|'), true);
  assert.equal(validateSource.includes('CameraView'), false);
});

test('session timing prefers backend-owned grace and metered boundaries', () => {
  const sessionSource = readSource('../src/features/parking/screens/SessionScreen.tsx');

  assert.equal(sessionSource.includes('session.parkingGraceEndsAt'), true);
  assert.equal(sessionSource.includes('session.meteredStartedAt'), true);
});
