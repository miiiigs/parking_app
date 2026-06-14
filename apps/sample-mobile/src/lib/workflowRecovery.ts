import type { ParkingLot } from '../features/parking/types';
import type { StoredWorkflowSnapshot } from './workflowStorage';
import { getNextSelectedSlotId } from './workflowLogic';

export function shouldScheduleReservationFollowUpNotifications(params: {
  stage: StoredWorkflowSnapshot['stage'];
  createdReservation: StoredWorkflowSnapshot['createdReservation'];
  activeParkingSession: StoredWorkflowSnapshot['activeParkingSession'];
  scheduledNotificationIds: string[];
}) {
  if (params.stage !== 'arrival') {
    return false;
  }

  if (!params.createdReservation || params.activeParkingSession) {
    return false;
  }

  return params.scheduledNotificationIds.length < 2;
}

export function buildOfflineRecoveryPatch({
  fallbackSlots,
  storedWorkflow,
  currentStage,
}: {
  fallbackSlots: ParkingLot['slots'];
  storedWorkflow: StoredWorkflowSnapshot | null;
  currentStage: 'home' | 'reserve' | 'arrival' | 'session';
}) {
  const hasStoredParkingFlow = Boolean(storedWorkflow && storedWorkflow.stage !== 'home');

  const patch = {
    connectionState: 'offline' as const,
    connectionMessage: hasStoredParkingFlow
      ? 'Live backend data is unavailable. Restoring the current parking flow from saved state. Tap Retry to reconnect.'
      : 'Live backend data is unavailable. Showing fallback data. Tap Retry to check again.',
  };

  if (currentStage === 'home' && storedWorkflow && storedWorkflow.stage !== 'home') {
    const stored = storedWorkflow;
    return {
      ...patch,
      stage: stored.stage,
      selectedSlotId: getNextSelectedSlotId(fallbackSlots, stored.selectedSlotId),
      selectedArrivalWindowMinutes: stored.selectedArrivalWindowMinutes,
      plateNumber: stored.plateNumber,
      validationQrToken: stored.validationQrToken,
      createdReservation: stored.createdReservation,
      activeParkingSession: stored.activeParkingSession,
      scheduledNotificationIds: stored.scheduledNotificationIds,
      reservationError: null,
    };
  }

  return patch;
}
