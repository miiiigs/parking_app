import test from 'node:test';
import assert from 'node:assert/strict';

import { buildOperatorDashboardMetrics } from '../lib/operatorDashboardMetrics.ts';

test('builds operator metrics from normalized slot, session, and payment data', () => {
  const metrics = buildOperatorDashboardMetrics({
    reservations: [
      { status: 'active' },
      { status: 'completed' },
      { status: 'no-show' },
      { status: 'active' },
    ],
    operatorSlotCount: 8,
    occupiedSlotCount: 3,
    slotRows: [
      { id: 'slot-1', status: 'available' },
      { id: 'slot-2', status: 'reserved' },
      { id: 'slot-3', status: 'blocked' },
    ],
    normalizedSlotRows: [
      { id: 'slot-1', status: 'occupied' },
      { id: 'slot-2', status: 'reserved' },
      { id: 'slot-3', status: 'blocked' },
    ],
    completedSessionRows: [
      {
        status: 'completed',
        started_at: '2026-06-07T10:00:00.000Z',
        ended_at: '2026-06-07T11:30:00.000Z',
        billed_minutes: null,
      },
      {
        status: 'completed',
        started_at: '2026-06-07T12:00:00.000Z',
        ended_at: null,
        billed_minutes: 45,
      },
    ],
    paymentRows: [
      { status: 'paid', amount: 120 },
      { status: 'failed', amount: 60 },
      { status: 'paid', amount: 30.5 },
    ],
  });

  assert.deepEqual(metrics, {
    activeReservations: 2,
    occupiedSlots: 3,
    completedSessions: 2,
    noShows: 1,
    dataMismatches: 1,
    totalRevenue: 150.5,
    occupancyRate: 37.5,
    averageSessionDuration: 67.5,
  });
});
