import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReservationFollowUpNotificationPlan } from '../src/lib/notificationScheduling.ts';

test('schedules both follow-up reminders for a future reservation', () => {
  const now = Date.parse('2026-04-11T10:00:00.000Z');
  const expiresAt = new Date(now + 20 * 60 * 1000).toISOString();
  const originalNow = Date.now;

  Date.now = () => now;

  try {
    const notificationPlan = buildReservationFollowUpNotificationPlan({
      reservationId: 'reservation-1',
      slotLabel: 'A-01',
      expiresAt,
    });

    assert.deepEqual(
      notificationPlan.map((notification) => notification.type),
      ['reservation-reminder', 'reservation-expiring'],
    );
    assert.equal(notificationPlan[0].title, 'Reservation reminder');
    assert.equal(notificationPlan[0].body, 'A-01 expires soon. Please arrive before the window closes.');
    assert.equal(notificationPlan[0].triggerAt, new Date(now + 5 * 60 * 1000).toISOString());
    assert.equal(notificationPlan[1].title, 'Reservation expiring');
    assert.equal(notificationPlan[1].triggerAt, expiresAt);
  } finally {
    Date.now = originalNow;
  }
});

test('skips the reminder when the expiry window is too short', () => {
  const now = Date.parse('2026-04-11T10:00:00.000Z');
  const expiresAt = new Date(now + 4 * 60 * 1000).toISOString();
  const originalNow = Date.now;

  Date.now = () => now;

  try {
    const notificationPlan = buildReservationFollowUpNotificationPlan({
      reservationId: 'reservation-2',
      slotLabel: 'B-02',
      expiresAt,
    });

    assert.deepEqual(notificationPlan.map((notification) => notification.type), ['reservation-expiring']);
    assert.equal(notificationPlan[0].triggerAt, expiresAt);
  } finally {
    Date.now = originalNow;
  }
});

test('returns only the expiry notification when the reservation is effectively immediate', () => {
  const now = Date.parse('2026-04-11T10:00:00.000Z');
  const expiresAt = new Date(now + 3000).toISOString();
  const originalNow = Date.now;

  Date.now = () => now;

  try {
    const notificationPlan = buildReservationFollowUpNotificationPlan({
      reservationId: 'reservation-3',
      slotLabel: 'C-03',
      expiresAt,
    });

    assert.deepEqual(notificationPlan.map((notification) => notification.type), ['reservation-expiring']);
    assert.equal(notificationPlan[0].triggerAt, expiresAt);
  } finally {
    Date.now = originalNow;
  }
});

test('rejects malformed expiry inputs by not scheduling notifications', () => {
  const notificationPlan = buildReservationFollowUpNotificationPlan({
    reservationId: 'reservation-5',
    slotLabel: 'E-05',
    expiresAt: 'not-a-date',
  });

  assert.deepEqual(notificationPlan, []);
});
