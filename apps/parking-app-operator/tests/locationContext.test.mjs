import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertOperatorLocationRequest,
  pickOperatorLocation,
} from '../lib/operatorLocation.ts';
import { hasOperatorLocationAssignment } from '../lib/operatorLocationAccess.ts';

test('prefers the selected operator location when it is active', () => {
  const locations = [
    { id: 'lot-a', name: 'Lot A' },
    { id: 'lot-b', name: 'Lot B' },
  ];

  const selected = pickOperatorLocation(locations, 'lot-b');

  assert.deepEqual(selected, { id: 'lot-b', name: 'Lot B' });
});

test('falls back to the first active location when the selected one is missing', () => {
  const locations = [
    { id: 'lot-a', name: 'Lot A' },
    { id: 'lot-b', name: 'Lot B' },
  ];

  const selected = pickOperatorLocation(locations, 'lot-c');

  assert.deepEqual(selected, { id: 'lot-a', name: 'Lot A' });
});

test('rejects API requests that target a different location than the active operator context', () => {
  assert.throws(
    () => assertOperatorLocationRequest('lot-a', 'lot-b'),
    /does not match the active operator location/i,
  );
});

test('allows API requests that target the active operator location', () => {
  assert.doesNotThrow(() => assertOperatorLocationRequest('lot-a', 'lot-a'));
  assert.doesNotThrow(() => assertOperatorLocationRequest('lot-a', null));
});

test('allows gate mutation only when the authenticated operator has a durable location assignment', async () => {
  const assigned = await hasOperatorLocationAssignment({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-key',
    userId: 'operator-a',
    locationId: 'lot-a',
    fetcher: async () => new Response(JSON.stringify([{ user_id: 'operator-a', location_id: 'lot-a' }]), { status: 200 }),
  });

  assert.equal(assigned, true);
});

test('denies cross-location gate mutation when no matching assignment exists', async () => {
  const assigned = await hasOperatorLocationAssignment({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-key',
    userId: 'operator-a',
    locationId: 'lot-b',
    fetcher: async () => new Response(JSON.stringify([{ user_id: 'operator-a', location_id: 'lot-a' }]), { status: 200 }),
  });

  assert.equal(assigned, false);
});
