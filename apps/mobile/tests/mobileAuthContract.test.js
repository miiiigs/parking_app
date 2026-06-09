const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
