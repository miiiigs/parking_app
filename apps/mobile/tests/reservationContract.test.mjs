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

test('session operations prime mobile auth before rpc calls', () => {
  const source = readSource('../src/lib/reservations.ts');

  assert.equal(source.includes('await ensureMobileAuthSession();'), true);
  assert.equal(source.includes("supabase.rpc('start_parking_session'"), true);
  assert.equal(source.includes("supabase.rpc('end_parking_session'"), true);
});
