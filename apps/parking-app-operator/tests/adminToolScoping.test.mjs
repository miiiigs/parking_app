import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLocationScopedAdminResetTargets } from '../lib/operatorAdminScope.ts';

test('collects only records that belong to the active lot scope', () => {
  const scoped = buildLocationScopedAdminResetTargets({
    locationId: 'lot-a',
    locationSlotIds: ['slot-1', 'slot-2'],
    reservations: [
      { id: 'reservation-1', slotId: 'slot-1' },
      { id: 'reservation-2', slotId: 'slot-9' },
    ],
    sessions: [
      { id: 'session-1', reservationId: 'reservation-1', slotId: 'slot-1' },
      { id: 'session-2', reservationId: 'reservation-2', slotId: 'slot-9' },
      { id: 'session-3', reservationId: 'reservation-1', slotId: null },
    ],
    payments: [
      { id: 'payment-1', reservationId: 'reservation-1', sessionId: null },
      { id: 'payment-2', reservationId: null, sessionId: 'session-3' },
      { id: 'payment-3', reservationId: 'reservation-2', sessionId: null },
    ],
    operatorEvents: [
      { id: 'event-1', slotId: 'slot-2', reservationId: null, sessionId: null, payload: null },
      { id: 'event-2', slotId: null, reservationId: null, sessionId: null, payload: { location_id: 'lot-a' } },
      { id: 'event-3', slotId: null, reservationId: null, sessionId: null, payload: { locationId: 'lot-b' } },
      { id: 'event-4', slotId: null, reservationId: 'reservation-1', sessionId: null, payload: null },
      { id: 'event-5', slotId: null, reservationId: null, sessionId: 'session-3', payload: null },
    ],
  });

  assert.deepEqual(scoped.slotIds, ['slot-1', 'slot-2']);
  assert.deepEqual(scoped.reservationIds, ['reservation-1']);
  assert.deepEqual(scoped.sessionIds, ['session-1', 'session-3']);
  assert.deepEqual(scoped.paymentIds, ['payment-1', 'payment-2']);
  assert.deepEqual(scoped.operatorEventIds, ['event-1', 'event-2', 'event-4', 'event-5']);
});
