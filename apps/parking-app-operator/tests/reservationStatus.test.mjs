import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveReservationStatus } from '../lib/operatorReservationStatus.ts';

test('completed linked sessions override an active reservation row', () => {
  assert.equal(
    deriveReservationStatus({
      rawStatus: 'confirmed',
      linkedSessionStatus: 'completed',
      expiresAt: '2026-06-08T10:00:00.000Z',
    }),
    'completed',
  );
});

test('expired reservations without a linked session are treated as no-show', () => {
  assert.equal(
    deriveReservationStatus({
      rawStatus: 'confirmed',
      linkedSessionStatus: null,
      expiresAt: '2026-06-07T10:00:00.000Z',
      now: new Date('2026-06-08T10:00:00.000Z'),
    }),
    'no-show',
  );
});
