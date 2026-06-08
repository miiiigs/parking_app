import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertOperatorLocationRequest,
  pickOperatorLocation,
} from '../lib/operatorLocation.ts';

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
