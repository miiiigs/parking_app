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

test('session rpc rejects unauthenticated, foreign, and expired reservations', () => {
  const startSource = readSource('../../../supabase/start_parking_session.sql');
  const endSource = readSource('../../../supabase/end_parking_session.sql');

  assert.equal(startSource.includes('Not authenticated'), true);
  assert.equal(startSource.includes('Reservation does not belong to the current user'), true);
  assert.equal(startSource.includes('Reservation has expired'), true);
  assert.equal(endSource.includes('Not authenticated'), true);
  assert.equal(endSource.includes('Reservation does not belong to the current user'), true);
});
