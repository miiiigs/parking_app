import type { ParkingSessionResult, ReservationResult } from '../../../lib/reservations';

export type ParkingFlowStage = 'home' | 'reserve' | 'arrival' | 'session';

export type ParkingFlowStateSnapshot = {
  stage: ParkingFlowStage;
  selectedSlotId: string | null;
  selectedArrivalWindowMinutes: number;
  plateNumber: string;
  validationQrToken: string | null;
  createdReservation: ReservationResult | null;
  activeParkingSession: ParkingSessionResult | null;
  scheduledNotificationIds: string[];
};
