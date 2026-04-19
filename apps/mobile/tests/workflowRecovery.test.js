const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildOfflineRecoveryPatch,
  shouldScheduleReservationFollowUpNotifications,
} = require('../src/lib/workflowRecovery.js');

test('restores the saved parking flow when offline and a stored workflow exists', () => {
  const patch = buildOfflineRecoveryPatch({
    fallbackSlots: [
      { id: 'slot-1', status: 'available' },
      { id: 'slot-2', status: 'occupied' },
    ],
    currentStage: 'home',
    storedWorkflow: {
      stage: 'validate',
      selectedSlotId: 'slot-2',
      selectedArrivalWindowMinutes: 60,
      plateNumber: 'ABC-1234',
      validationQrToken: 'qr-token-2',
      createdReservation: { reservation_id: 'reservation-2', slot_id: 'slot-2' },
      activeParkingSession: null,
      scheduledNotificationIds: ['notif-1'],
    },
  });

  assert.equal(patch.connectionState, 'offline');
  assert.equal(patch.stage, 'validate');
  assert.equal(patch.selectedSlotId, 'slot-2');
  assert.equal(patch.selectedArrivalWindowMinutes, 60);
  assert.equal(patch.plateNumber, 'ABC-1234');
  assert.equal(patch.validationQrToken, 'qr-token-2');
  assert.deepEqual(patch.scheduledNotificationIds, ['notif-1']);
  assert.equal(patch.reservationError, null);
});

test('falls back to an offline status banner when there is no saved parking flow', () => {
  const patch = buildOfflineRecoveryPatch({
    fallbackSlots: [],
    currentStage: 'home',
    storedWorkflow: null,
  });

  assert.equal(patch.connectionState, 'offline');
  assert.equal(patch.connectionMessage, 'Live backend data is unavailable. Showing fallback data. Tap Retry to check again.');
  assert.equal(patch.stage, undefined);
});

test('only schedules background reminders when the workflow is ready and nothing is already queued', () => {
  const workflowState = {
    stage: 'validate',
    createdReservation: { reservation_id: 'reservation-3' },
    activeParkingSession: null,
    scheduledNotificationIds: ['notif-confirmation'],
  };

  assert.equal(shouldScheduleReservationFollowUpNotifications(workflowState, false), true);
  assert.equal(shouldScheduleReservationFollowUpNotifications(workflowState, true), false);
});

test('blocks background reminders for the wrong workflow state', () => {
  const notReadyStates = [
    {
      stage: 'home',
      createdReservation: { reservation_id: 'reservation-4' },
      activeParkingSession: null,
      scheduledNotificationIds: [],
    },
    {
      stage: 'validate',
      createdReservation: null,
      activeParkingSession: null,
      scheduledNotificationIds: [],
    },
    {
      stage: 'validate',
      createdReservation: { reservation_id: 'reservation-4' },
      activeParkingSession: { session_id: 'session-4' },
      scheduledNotificationIds: [],
    },
    {
      stage: 'validate',
      createdReservation: { reservation_id: 'reservation-4' },
      activeParkingSession: null,
      scheduledNotificationIds: ['notif-1', 'notif-2'],
    },
  ];

  for (const workflowState of notReadyStates) {
    assert.equal(shouldScheduleReservationFollowUpNotifications(workflowState, false), false);
  }
});

test('does not restore a stored workflow when the saved stage is home', () => {
  const patch = buildOfflineRecoveryPatch({
    fallbackSlots: [{ id: 'slot-1', status: 'available' }],
    currentStage: 'home',
    storedWorkflow: {
      stage: 'home',
      selectedSlotId: 'slot-1',
      selectedArrivalWindowMinutes: 60,
      plateNumber: 'ABC-1234',
      validationQrToken: 'qr-token-1',
      createdReservation: null,
      activeParkingSession: null,
      scheduledNotificationIds: [],
    },
  });

  assert.equal(patch.stage, undefined);
  assert.equal(patch.selectedSlotId, undefined);
  assert.equal(patch.connectionState, 'offline');
});

test('keeps a valid selected slot when reconnecting to live data', () => {
  const patch = buildOfflineRecoveryPatch({
    fallbackSlots: [
      { id: 'slot-1', status: 'available' },
      { id: 'slot-2', status: 'available' },
    ],
    currentStage: 'home',
    storedWorkflow: {
      stage: 'validate',
      selectedSlotId: 'slot-2',
      selectedArrivalWindowMinutes: 60,
      plateNumber: 'ABC-1234',
      validationQrToken: 'qr-token-2',
      createdReservation: { reservation_id: 'reservation-2', slot_id: 'slot-2' },
      activeParkingSession: null,
      scheduledNotificationIds: [],
    },
  });

  assert.equal(patch.selectedSlotId, 'slot-2');
  assert.equal(patch.selectedArrivalWindowMinutes, 60);
});