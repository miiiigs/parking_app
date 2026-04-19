const test = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPIRY_REMINDER_OFFSET_MINUTES,
  buildReservationFollowUpNotificationPlan,
} = require('../src/lib/notificationScheduling.js');

test('schedules both follow-up reminders for a future reservation', () => {
  const now = Date.parse('2026-04-11T10:00:00.000Z');
  const expiresAt = new Date(now + 20 * 60 * 1000).toISOString();

  const notificationPlan = buildReservationFollowUpNotificationPlan({
    reservationId: 'reservation-1',
    slotLabel: 'A-01',
    expiresAt,
    now,
  });

  assert.deepEqual(
    notificationPlan.map((notification) => notification.type),
    ['reservation-expiry-reminder', 'reservation-expired'],
  );
  assert.equal(notificationPlan[0].title, 'Reservation expiring soon');
  assert.equal(notificationPlan[0].body, `A-01 expires in ${EXPIRY_REMINDER_OFFSET_MINUTES} minutes.`);
  assert.equal(notificationPlan[1].title, 'Reservation expired');
  assert.ok(notificationPlan.every((notification) => notification.triggerAt > now + 5000));
});

test('skips the reminder when the expiry window is too short', () => {
  const now = Date.parse('2026-04-11T10:00:00.000Z');
  const expiresAt = new Date(now + 4 * 60 * 1000).toISOString();

  const notificationPlan = buildReservationFollowUpNotificationPlan({
    reservationId: 'reservation-2',
    slotLabel: 'B-02',
    expiresAt,
    now,
  });

  assert.deepEqual(notificationPlan.map((notification) => notification.type), ['reservation-expired']);
  assert.equal(notificationPlan[0].triggerAt, Date.parse(expiresAt));
});

test('returns no follow-up notifications when the reservation is effectively immediate', () => {
  const now = Date.parse('2026-04-11T10:00:00.000Z');
  const expiresAt = new Date(now + 3000).toISOString();

  const notificationPlan = buildReservationFollowUpNotificationPlan({
    reservationId: 'reservation-3',
    slotLabel: 'C-03',
    expiresAt,
    now,
  });

  assert.deepEqual(notificationPlan, []);
});

test('uses the provided reminder offset when building the plan', () => {
  const now = Date.parse('2026-04-11T10:00:00.000Z');
  const expiresAt = new Date(now + 15 * 60 * 1000).toISOString();

  const notificationPlan = buildReservationFollowUpNotificationPlan({
    reservationId: 'reservation-4',
    slotLabel: 'D-04',
    expiresAt,
    now,
    reminderOffsetMinutes: 10,
  });

  assert.deepEqual(notificationPlan.map((notification) => notification.type), ['reservation-expiry-reminder', 'reservation-expired']);
  assert.equal(notificationPlan[0].body, 'D-04 expires in 10 minutes.');
});

test('rejects malformed expiry inputs by not scheduling notifications', () => {
  const notificationPlan = buildReservationFollowUpNotificationPlan({
    reservationId: 'reservation-5',
    slotLabel: 'E-05',
    expiresAt: 'not-a-date',
    now: Date.parse('2026-04-11T10:00:00.000Z'),
  });

  assert.deepEqual(notificationPlan, []);
});