import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

test('mobile auth uses real sign-in and sign-up helpers', () => {
  const source = readSource('../src/lib/supabaseClient.ts');

  assert.equal(source.includes('signInAnonymously'), false);
  assert.equal(source.includes('signInWithPassword'), true);
  assert.equal(source.includes('signUp('), true);
  assert.equal(source.includes('subscribeToMobileAuthChanges'), true);
});
