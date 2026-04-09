const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildStoredWorkflowSnapshot,
  getNextSelectedSlotId,
} = require('../src/lib/workflowLogic.js');

test('keeps the current slot when it still exists', () => {
  const slots = [
    { id: 'slot-1', status: 'available' },
    { id: 'slot-2', status: 'reserved' },
  ];

  assert.equal(getNextSelectedSlotId(slots, 'slot-2'), 'slot-2');
});

test('falls back to the first available slot', () => {
  const slots = [
    { id: 'slot-1', status: 'occupied' },
    { id: 'slot-2', status: 'available' },
    { id: 'slot-3', status: 'available' },
  ];

  assert.equal(getNextSelectedSlotId(slots, 'missing-slot'), 'slot-2');
});

test('falls back to the first slot when nothing is available', () => {
  const slots = [
    { id: 'slot-1', status: 'blocked' },
    { id: 'slot-2', status: 'reserved' },
  ];

  assert.equal(getNextSelectedSlotId(slots, null), 'slot-1');
});

test('returns null when there are no slots', () => {
  assert.equal(getNextSelectedSlotId([], null), null);
});

test('builds a stored workflow snapshot with notification ids', () => {
  const snapshot = buildStoredWorkflowSnapshot(
    {
      stage: 'validate',
      selectedSlotId: 'slot-9',
      selectedArrivalWindowMinutes: 60,
      plateNumber: 'ABC-1234',
      scheduledNotificationIds: ['notif-1', 'notif-2'],
    },
    'reservation-123',
  );

  assert.equal(snapshot.stage, 'validate');
  assert.equal(snapshot.selectedSlotId, 'slot-9');
  assert.equal(snapshot.selectedArrivalWindowMinutes, 60);
  assert.equal(snapshot.plateNumber, 'ABC-1234');
  assert.equal(snapshot.reservationId, 'reservation-123');
  assert.deepEqual(snapshot.scheduledNotificationIds, ['notif-1', 'notif-2']);
  assert.equal(typeof snapshot.savedAt, 'string');
});