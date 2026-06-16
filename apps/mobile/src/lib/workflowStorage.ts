import * as SecureStore from 'expo-secure-store';

import type { ParkingSessionResult, ReservationResult } from './reservations';

const WORKFLOW_STORAGE_KEY = 'smart-parking-mobile-workflow-v1';

export type StoredWorkflowSnapshot = {
  stage: 'home' | 'reserve' | 'arrival' | 'session';
  selectedSlotId: string | null;
  selectedArrivalWindowMinutes: number;
  plateNumber: string;
  validationQrToken: string;
  createdReservation: ReservationResult | null;
  activeParkingSession: ParkingSessionResult | null;
  reservationId: string | null;
  scheduledNotificationIds: string[];
  savedAt: string;
};

export async function loadStoredWorkflowSnapshot(): Promise<StoredWorkflowSnapshot | null> {
  try {
    const rawValue = await SecureStore.getItemAsync(WORKFLOW_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as StoredWorkflowSnapshot;

    if (!parsedValue || typeof parsedValue !== 'object') {
      return null;
    }

    return {
      stage: parsedValue.stage,
      selectedSlotId: parsedValue.selectedSlotId ?? null,
      selectedArrivalWindowMinutes: parsedValue.selectedArrivalWindowMinutes,
      plateNumber: parsedValue.plateNumber ?? 'ABC-1234',
      validationQrToken: parsedValue.validationQrToken ?? '',
      createdReservation: parsedValue.createdReservation ?? null,
      activeParkingSession: parsedValue.activeParkingSession ?? null,
      reservationId: parsedValue.reservationId ?? null,
      scheduledNotificationIds: Array.isArray(parsedValue.scheduledNotificationIds) ? parsedValue.scheduledNotificationIds : [],
      savedAt: parsedValue.savedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveStoredWorkflowSnapshot(snapshot: StoredWorkflowSnapshot) {
  try {
    await SecureStore.setItemAsync(WORKFLOW_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage write failures and keep the live workflow usable.
  }
}

export async function clearStoredWorkflowSnapshot() {
  try {
    await SecureStore.deleteItemAsync(WORKFLOW_STORAGE_KEY);
  } catch {
    // Ignore cleanup failures; the backend state remains the source of truth.
  }
}
