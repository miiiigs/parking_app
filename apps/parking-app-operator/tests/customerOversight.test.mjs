import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCustomerOversightItems } from '../lib/customerOversight.ts';

test('customer oversight groups customer activity, location history, payments, and dashboard overlap', () => {
  const items = buildCustomerOversightItems({
    reservations: [
      {
        id: 'res-1',
        user_id: 'user-a',
        slot_id: 'slot-1',
        plate_number: 'ABC123',
        status: 'confirmed',
        reserved_at: '2026-06-25T09:00:00.000Z',
        expires_at: '2026-06-25T11:00:00.000Z',
      },
      {
        id: 'res-2',
        user_id: 'user-a',
        slot_id: 'slot-2',
        plate_number: 'XYZ999',
        status: 'completed',
        reserved_at: '2026-06-24T08:00:00.000Z',
        expires_at: '2026-06-24T09:00:00.000Z',
      },
      {
        id: 'res-3',
        user_id: 'user-b',
        slot_id: 'slot-3',
        plate_number: 'LMN456',
        status: 'expired',
        reserved_at: '2026-06-20T08:00:00.000Z',
        expires_at: '2026-06-20T09:00:00.000Z',
      },
    ],
    sessions: [
      {
        id: 'ses-1',
        reservation_id: 'res-1',
        slot_id: 'slot-1',
        started_at: '2026-06-25T09:10:00.000Z',
        ended_at: null,
        status: 'active',
      },
      {
        id: 'ses-2',
        reservation_id: 'res-2',
        slot_id: 'slot-2',
        started_at: '2026-06-24T08:10:00.000Z',
        ended_at: '2026-06-24T10:00:00.000Z',
        status: 'completed',
      },
    ],
    payments: [
      {
        id: 'pay-1',
        reservation_id: 'res-2',
        session_id: 'ses-2',
        status: 'paid',
        amount: 140,
        created_at: '2026-06-24T10:05:00.000Z',
        paid_at: '2026-06-24T10:06:00.000Z',
      },
      {
        id: 'pay-2',
        reservation_id: 'res-1',
        session_id: 'ses-1',
        status: 'pending',
        amount: 50,
        created_at: '2026-06-25T09:20:00.000Z',
        paid_at: null,
      },
    ],
    slotLocationBySlotId: new Map([
      ['slot-1', { id: 'loc-1', name: 'BGC Pilot Site' }],
      ['slot-2', { id: 'loc-2', name: 'Makati Business Hub' }],
      ['slot-3', { id: 'loc-3', name: 'Ortigas Center Deck' }],
    ]),
    authUsersById: new Map([
      ['user-a', { id: 'user-a', email: 'customer-a@example.com', phone: '+639171111111', displayName: 'Customer A' }],
      ['user-b', { id: 'user-b', email: null, phone: null, displayName: null }],
    ]),
    dashboardAccountsByUserId: new Map([
      ['user-a', { user_id: 'user-a', display_name: 'Customer A Dashboard', role: 'support' }],
    ]),
    now: new Date('2026-06-25T09:30:00.000Z'),
  });

  assert.equal(items.length, 2);
  assert.equal(items[0]?.userId, 'user-a');
  assert.equal(items[0]?.hasDashboardAccess, true);
  assert.equal(items[0]?.dashboardRole, 'support');
  assert.equal(items[0]?.activeReservations, 1);
  assert.equal(items[0]?.completedReservations, 1);
  assert.equal(items[0]?.activeSessions, 1);
  assert.equal(items[0]?.completedSessions, 1);
  assert.equal(items[0]?.latestLocationName, 'BGC Pilot Site');
  assert.deepEqual(items[0]?.visitedLocationNames, ['BGC Pilot Site', 'Makati Business Hub']);
  assert.deepEqual(items[0]?.recentVehiclePlates, ['ABC123', 'XYZ999']);
  assert.equal(items[0]?.latestPaymentStatus, 'pending');
  assert.equal(items[0]?.latestPaymentAmount, 50);
  assert.equal(items[0]?.displayName, 'Customer A');
  assert.equal(items[1]?.userId, 'user-b');
  assert.equal(items[1]?.noShowReservations, 1);
  assert.equal(items[1]?.hasDashboardAccess, false);
  assert.equal(items[1]?.latestLocationName, 'Ortigas Center Deck');
});
