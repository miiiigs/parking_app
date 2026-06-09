import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { calculateBill, createExitCode, createReceiptNumber, createReservationCode, createTransactionId } from '../lib/flow';
import { secureStorage } from '../lib/storage';
import type { Booking, CompletedSession, ParkingLot, ParkingSession, ParkingSlot } from '../types';

interface ReserveSlotInput {
  lot: ParkingLot;
  slot: ParkingSlot;
  arrivalWindowMinutes: number;
  plateNumber: string;
}

interface ParkingFlowState {
  booking: Booking | null;
  session: ParkingSession | null;
  completedSession: CompletedSession | null;
  reserveSlot: (input: ReserveSlotInput) => void;
  startSession: () => ParkingSession | null;
  finishSession: (durationSeconds: number) => CompletedSession | null;
  resetFlow: () => void;
}

const initialState = {
  booking: null,
  session: null,
  completedSession: null,
};

export const useParkingFlowStore = create<ParkingFlowState>()(
  persist(
    (set, get) => ({
      ...initialState,
      reserveSlot: ({ lot, slot, arrivalWindowMinutes, plateNumber }) => {
        const booking: Booking = {
          reservationCode: createReservationCode(slot.id),
          lotId: lot.id,
          lotName: lot.name,
          address: lot.address,
          slot,
          arrivalWindowMinutes,
          plateNumber,
          pricePerHour: lot.pricePerHour,
          createdAt: new Date().toISOString(),
        };

        set({ booking, session: null, completedSession: null });
      },
      startSession: () => {
        const booking = get().booking;
        if (!booking) {
          return null;
        }

        const session: ParkingSession = {
          ...booking,
          startTime: new Date().toISOString(),
        };

        set({ session });
        return session;
      },
      finishSession: (durationSeconds) => {
        const session = get().session;
        if (!session) {
          return null;
        }

        const completedSession: CompletedSession = {
          ...session,
          endTime: new Date().toISOString(),
          durationSeconds,
          totalBill: calculateBill(durationSeconds, session.pricePerHour),
          receiptNumber: createReceiptNumber(),
          transactionId: createTransactionId(),
          exitCode: createExitCode(session.slot.id),
        };

        set({ booking: null, session: null, completedSession });
        return completedSession;
      },
      resetFlow: () => set(initialState),
    }),
    {
      name: '@parking/sample-mobile-flow',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        booking: state.booking,
        session: state.session,
        completedSession: state.completedSession,
      }),
    }
  )
);
