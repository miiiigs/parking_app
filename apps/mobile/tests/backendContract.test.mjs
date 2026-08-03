import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

test('reservation rpc derives identity and price on the server', () => {
  const source = readSource('../../../supabase/reserve_parking_slot.sql');

  assert.equal(source.includes('p_user_id'), false);
  assert.equal(source.includes('p_reservation_fee'), false);
  assert.equal(source.includes('auth.uid()'), true);
  assert.equal(source.includes('Unsupported arrival window'), true);
  assert.equal(source.includes('grant execute on function reserve_parking_slot(uuid, text, integer, numeric)'), true);
});

test('gate confirmation is service-only, location-scoped, locked, and idempotent', () => {
  const confirmationSource = readSource('../../../supabase/confirm_parking_entry.sql');
  const startSource = readSource('../../../supabase/start_parking_session.sql');
  const endSource = readSource('../../../supabase/end_parking_session.sql');

  assert.equal(confirmationSource.includes('for update'), true);
  assert.equal(confirmationSource.includes('v_slot.location_id <> p_location_id'), true);
  assert.equal(confirmationSource.includes('Entry pass has expired'), true);
  assert.equal(confirmationSource.includes('parking_grace_ends_at'), true);
  assert.equal(confirmationSource.includes('idempotent_replay'), true);
  assert.equal(confirmationSource.includes("extensions.digest(trim(p_entry_token), 'sha256')"), true);
  assert.equal(confirmationSource.includes('walk_in_entry_pass_tokens.reservation_id = p_reservation_id'), true);
  assert.equal(confirmationSource.includes('alter table parking_slots'), true);
  assert.equal(confirmationSource.includes('add column if not exists slot_kind text'), true);
  assert.equal(confirmationSource.includes("set slot_kind = 'standard'"), true);
  assert.equal(confirmationSource.includes("check (slot_kind in ('standard', 'walk_in_hub'))"), true);
  assert.equal(confirmationSource.includes("v_reservation.status <> 'confirmed' or v_existing_session.status <> 'active'"), true);
  assert.equal(
    confirmationSource.indexOf("v_existing_session.status <> 'active'") < confirmationSource.indexOf('return query select'),
    true,
  );
  assert.equal(confirmationSource.includes('Entry pass is in a terminal state'), true);
  assert.equal(confirmationSource.includes("'parking_entry_confirmed'"), true);
  assert.equal(confirmationSource.includes('grant execute on function confirm_parking_entry(uuid, uuid, text) to service_role'), true);
  assert.equal(confirmationSource.includes('from public, anon, authenticated'), true);
  assert.equal(startSource.includes('grant execute on function start_parking_session(uuid, text) to service_role'), true);
  assert.equal(startSource.includes('to anon, authenticated'), false);
  assert.equal(endSource.includes('Not authenticated'), true);
  assert.equal(endSource.includes('Reservation does not belong to the current user'), true);
});
