const { getNextSelectedSlotId } = require('./workflowLogic.js');

function shouldScheduleReservationFollowUpNotifications(workflowState, alreadyScheduledReservationNotifications) {
  if (workflowState.stage !== 'validate') {
    return false;
  }

  if (!workflowState.createdReservation || workflowState.activeParkingSession) {
    return false;
  }

  if (workflowState.scheduledNotificationIds.length > 1) {
    return false;
  }

  return !alreadyScheduledReservationNotifications;
}

function buildOfflineRecoveryPatch({
  fallbackSlots,
  storedWorkflow,
  currentStage,
}) {
  const hasStoredParkingFlow = Boolean(storedWorkflow && storedWorkflow.stage !== 'home');

  const patch = {
    connectionState: 'offline',
    connectionMessage: hasStoredParkingFlow
      ? 'Live backend data is unavailable. Restoring the current parking flow from saved state. Tap Retry to reconnect.'
      : 'Live backend data is unavailable. Showing fallback data. Tap Retry to check again.',
  };

  if (currentStage === 'home' && hasStoredParkingFlow) {
    return {
      ...patch,
      stage: storedWorkflow.stage,
      selectedSlotId: getNextSelectedSlotId(fallbackSlots, storedWorkflow.selectedSlotId),
      selectedArrivalWindowMinutes: storedWorkflow.selectedArrivalWindowMinutes,
      plateNumber: storedWorkflow.plateNumber,
      validationQrToken: storedWorkflow.validationQrToken,
      createdReservation: storedWorkflow.createdReservation,
      activeParkingSession: storedWorkflow.activeParkingSession,
      scheduledNotificationIds: storedWorkflow.scheduledNotificationIds,
      reservationError: null,
    };
  }

  return patch;
}

module.exports = {
  buildOfflineRecoveryPatch,
  shouldScheduleReservationFollowUpNotifications,
};