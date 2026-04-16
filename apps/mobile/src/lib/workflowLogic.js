function getNextSelectedSlotId(slots, currentSelectedSlotId) {
  if (currentSelectedSlotId && slots.some((slot) => slot.id === currentSelectedSlotId)) {
    return currentSelectedSlotId;
  }

  const nextAvailableSlot = slots.find((slot) => slot.status === 'available') ?? slots[0] ?? null;
  return nextAvailableSlot ? nextAvailableSlot.id : null;
}

function buildStoredWorkflowSnapshot(state, reservationId) {
  return {
    stage: state.stage,
    selectedSlotId: state.selectedSlotId,
    selectedArrivalWindowMinutes: state.selectedArrivalWindowMinutes,
    plateNumber: state.plateNumber,
    validationQrToken: state.validationQrToken ?? '',
    createdReservation: state.createdReservation ?? null,
    activeParkingSession: state.activeParkingSession ?? null,
    reservationId,
    scheduledNotificationIds: Array.isArray(state.scheduledNotificationIds) ? state.scheduledNotificationIds : [],
    savedAt: new Date().toISOString(),
  };
}

module.exports = {
  getNextSelectedSlotId,
  buildStoredWorkflowSnapshot,
};