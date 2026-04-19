const test = require('node:test');
const assert = require('node:assert/strict');

const { getSupabaseConfigStatus } = require('../src/lib/supabaseConfig.js');

test('reports both supabase keys as missing when no env is provided', () => {
  const configStatus = getSupabaseConfigStatus({});

  assert.equal(configStatus.isConfigured, false);
  assert.deepEqual(configStatus.missingKeys, ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']);
});

test('reports configured when the required supabase env vars exist', () => {
  const configStatus = getSupabaseConfigStatus({
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-value',
  });

  assert.equal(configStatus.isConfigured, true);
  assert.deepEqual(configStatus.missingKeys, []);
});

test('treats empty strings as missing configuration', () => {
  const configStatus = getSupabaseConfigStatus({
    EXPO_PUBLIC_SUPABASE_URL: '',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
  });

  assert.equal(configStatus.isConfigured, false);
  assert.deepEqual(configStatus.missingKeys, ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']);
});