const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildStoredWorkflowSnapshot,
  getNextSelectedSlotId,
} = require('../src/lib/workflowLogic.js');
const { workflowReducer } = require('../src/lib/workflowReducer.js');

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
      validationQrToken: 'qr-token-9',
      scheduledNotificationIds: ['notif-1', 'notif-2'],
      createdReservation: { reservation_id: 'reservation-9' },
      activeParkingSession: { session_id: 'session-9' },
    },
    'reservation-123',
  );

  assert.equal(snapshot.stage, 'validate');
  assert.equal(snapshot.selectedSlotId, 'slot-9');
  assert.equal(snapshot.selectedArrivalWindowMinutes, 60);
  assert.equal(snapshot.plateNumber, 'ABC-1234');
  assert.equal(snapshot.validationQrToken, 'qr-token-9');
  assert.equal(snapshot.reservationId, 'reservation-123');
  assert.deepEqual(snapshot.createdReservation, { reservation_id: 'reservation-9' });
  assert.deepEqual(snapshot.activeParkingSession, { session_id: 'session-9' });
  assert.deepEqual(snapshot.scheduledNotificationIds, ['notif-1', 'notif-2']);
  assert.equal(typeof snapshot.savedAt, 'string');
});

test('workflow reducer applies patch updates immutably', () => {
  const previousState = {
    stage: 'reserve',
    selectedSlotId: 'slot-1',
    selectedArrivalWindowMinutes: 60,
    plateNumber: 'ABC-1234',
    validationQrToken: 'token-1',
    scheduledNotificationIds: ['notif-1'],
    reservationError: null,
    createdReservation: null,
    activeParkingSession: null,
    operation: 'idle',
    connectionState: 'live',
    connectionMessage: null,
  };

  const nextState = workflowReducer(previousState, {
    type: 'patch',
    patch: {
      stage: 'validate',
      selectedSlotId: 'slot-2',
      scheduledNotificationIds: ['notif-2', 'notif-3'],
    },
  });

  assert.notStrictEqual(nextState, previousState);
  assert.equal(nextState.stage, 'validate');
  assert.equal(nextState.selectedSlotId, 'slot-2');
  assert.deepEqual(nextState.scheduledNotificationIds, ['notif-2', 'notif-3']);
  assert.equal(previousState.stage, 'reserve');
  assert.deepEqual(previousState.scheduledNotificationIds, ['notif-1']);
});

test('workflow reducer ignores unknown actions', () => {
  const previousState = {
    stage: 'home',
    selectedSlotId: null,
    selectedArrivalWindowMinutes: 60,
    plateNumber: 'ABC-1234',
    validationQrToken: '',
    scheduledNotificationIds: [],
    reservationError: null,
    createdReservation: null,
    activeParkingSession: null,
    operation: 'idle',
    connectionState: 'booting',
    connectionMessage: 'Syncing live parking data...',
  };

  const nextState = workflowReducer(previousState, { type: 'noop' });

  assert.equal(nextState, previousState);
});