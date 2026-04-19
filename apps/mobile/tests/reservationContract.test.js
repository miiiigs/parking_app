const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

test('reservation contract no longer exposes client-supplied user identity or pricing', () => {
  const source = readSource('../src/lib/reservations.ts');

  assert.equal(source.includes('p_user_id'), false);
  assert.equal(source.includes('p_reservation_fee'), false);
});

test('session operations prime mobile auth before rpc calls', () => {
  const source = readSource('../src/lib/reservations.ts');

  assert.equal(source.includes('await ensureMobileAuthSession();'), true);
  assert.equal(source.includes("supabase.rpc('start_parking_session'"), true);
  assert.equal(source.includes("supabase.rpc('end_parking_session'"), true);
});