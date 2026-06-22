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
  assert.equal(source.includes('You already have an active walk-in entry pass for this location'), true);
  assert.equal(source.includes('grant execute on function issue_walk_in_entry_pass(uuid, text, integer)'), true);
});

test('mobile walk-in contract uses backend issuance and start-session helpers', () => {
  const source = readSource('../src/lib/reservations.ts');

  assert.equal(source.includes("supabase.rpc('issue_walk_in_entry_pass'"), true);
  assert.equal(source.includes("supabase.rpc('start_walk_in_session'"), true);
  assert.equal(source.includes('await ensureMobileAuthSession();'), true);
});
