const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

test('reservation rpc derives identity and price on the server', () => {
  const source = readSource('../../../supabase/reserve_parking_slot.sql');

  assert.equal(source.includes('p_user_id'), false);
  assert.equal(source.includes('p_reservation_fee'), false);
  assert.equal(source.includes('auth.uid()'), true);
  assert.equal(source.includes('Unsupported arrival window'), true);
  assert.equal(source.includes('grant execute on function reserve_parking_slot(uuid, text, integer)'), true);
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