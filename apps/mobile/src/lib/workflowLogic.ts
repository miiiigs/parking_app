import type { ParkingFlowStateSnapshot } from '../features/parking/store/workflowSnapshot';

export function getNextSelectedSlotId(slots: Array<{ id: string; status?: string }>, currentSelectedSlotId: string | null) {
  if (currentSelectedSlotId && slots.some((slot) => slot.id === currentSelectedSlotId)) {
    return currentSelectedSlotId;
  }

  const nextAvailableSlot = slots.find((slot) => slot.status === 'available') ?? slots[0] ?? null;
  return nextAvailableSlot ? nextAvailableSlot.id : null;
}

export function buildStoredWorkflowSnapshot(state: ParkingFlowStateSnapshot, reservationId: string | null) {
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
