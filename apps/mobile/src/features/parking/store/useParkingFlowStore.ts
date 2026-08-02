import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { calculateBill, createExitCode, createReceiptNumber, createTransactionId } from '../lib/flow';
import { secureStorage } from '../lib/storage';
import type { Booking, CompletedSession, ParkingLot, ParkingSession, ParkingSlot } from '../types';
import {
  cancelReservationNotifications,
  sendSessionCompletedNotification,
  scheduleReservationConfirmationNotification,
  scheduleReservationReminderNotifications,
} from '../../../lib/notifications';
import {
  cancelParkingReservation,
  createParkingReservation,
  endParkingSession,
  getCurrentMobileWorkflowState,
  getParkingSessionByReservationId,
  issueWalkInEntryPass as issueWalkInEntryPassRequest,
  mapCompletedSession,
  mapReservationToBooking,
  mapWalkInReservationToBooking,
  mapSessionToParkingSession,
  type ParkingSessionResult,
  type ReservationResult,
} from '../../../lib/reservations';
import {
  clearStoredWorkflowSnapshot,
  loadStoredWorkflowSnapshot,
  saveStoredWorkflowSnapshot,
} from '../../../lib/workflowStorage';
import { buildStoredWorkflowSnapshot } from '../../../lib/workflowLogic';

interface ReserveSlotInput {
  lot: ParkingLot;
  slot: ParkingSlot;
  arrivalWindowMinutes: number;
  plateNumber: string;
}

interface IssueWalkInEntryPassInput {
  lot?: ParkingLot | null;
  plateNumber: string;
  holdMinutes?: number;
}

type ReservationDraft = {
  lotId: string;
  slotId: string | null;
  arrivalWindowMinutes: number;
  plateNumber: string;
};

interface ParkingFlowState {
  booking: Booking | null;
  session: ParkingSession | null;
  completedSession: CompletedSession | null;
  pendingPaymentIntentId: string | null;
  pendingPaymentMethodType: string | null;
  pendingPaymentQrImageUrl: string | null;
  reservationDraft: ReservationDraft | null;
  validationQrToken: string;
  scheduledNotificationIds: string[];
  isRestoring: boolean;
  hasHydrated: boolean;
  reserveSlot: (input: ReserveSlotInput) => Promise<Booking | null>;
  issueWalkInEntryPass: (input: IssueWalkInEntryPassInput) => Promise<Booking | null>;
  setReservationDraft: (draft: ReservationDraft) => void;
  clearReservationDraft: () => void;
  refreshSession: () => Promise<ParkingSession | null>;
  clearExpiredEntryPass: () => Promise<void>;
  finishSession: (durationSeconds: number) => Promise<CompletedSession | null>;
  setPendingPaymentAttempt: (value: {
    paymentIntentId: string | null;
    paymentMethodType?: string | null;
    qrImageUrl?: string | null;
  }) => void;
  clearPendingPaymentAttempt: () => void;
  markCompletedSessionPaymentStatus: (paymentStatus: string) => void;
  cancelReservation: () => Promise<void>;
  restoreWorkflow: (lots: ParkingLot[]) => Promise<void>;
  setValidationQrToken: (value: string) => void;
  setHasHydrated: (value: boolean) => void;
  resetFlow: () => Promise<void>;
}

type ResolvedSlot = {
  lot: ParkingLot;
  slot: ParkingSlot;
};

const initialState = {
  booking: null,
  session: null,
  completedSession: null,
  pendingPaymentIntentId: null,
  pendingPaymentMethodType: null,
  pendingPaymentQrImageUrl: null,
  reservationDraft: null,
  validationQrToken: '',
  scheduledNotificationIds: [] as string[],
  isRestoring: false,
  hasHydrated: false,
};

function findResolvedSlot(lots: ParkingLot[], slotId: string | undefined | null, slotLabel?: string | null): ResolvedSlot | null {
  if (!slotId && !slotLabel) {
    return null;
  }

  for (const lot of lots) {
    const slot = lot.slots.find((entry) => entry.id === slotId || entry.number === slotLabel) ?? null;
    if (slot) {
      return { lot, slot };
    }
  }

  return null;
}

function buildBookingFromState({
  lot,
  slot,
  reservation,
}: {
  lot: ParkingLot;
  slot: ParkingSlot;
  reservation: ReservationResult;
}): Booking {
  return {
    ...mapReservationToBooking(reservation, lot, slot),
    plateNumber: reservation.plate_number ?? '',
    qrToken: slot.qrToken ?? null,
  };
}

export const useParkingFlowStore = create<ParkingFlowState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setReservationDraft: (draft: ReservationDraft) => {
        set({ reservationDraft: draft });
      },
      clearReservationDraft: () => {
        set({ reservationDraft: null });
      },
      setHasHydrated: (value: boolean) => {
        set({ hasHydrated: value });
      },
      setPendingPaymentAttempt: ({ paymentIntentId, paymentMethodType = null, qrImageUrl = null }) => {
        set({
          pendingPaymentIntentId: paymentIntentId,
          pendingPaymentMethodType: paymentMethodType,
          pendingPaymentQrImageUrl: qrImageUrl,
        });
      },
      clearPendingPaymentAttempt: () => {
        set({
          pendingPaymentIntentId: null,
          pendingPaymentMethodType: null,
          pendingPaymentQrImageUrl: null,
        });
      },
      markCompletedSessionPaymentStatus: (paymentStatus: string) => {
        set((state) => ({
          completedSession: state.completedSession
            ? {
                ...state.completedSession,
                paymentStatus,
              }
            : null,
          pendingPaymentIntentId: paymentStatus === 'paid' ? null : state.pendingPaymentIntentId,
          pendingPaymentMethodType: paymentStatus === 'paid' ? null : state.pendingPaymentMethodType,
          pendingPaymentQrImageUrl: paymentStatus === 'paid' ? null : state.pendingPaymentQrImageUrl,
        }));
      },
      reserveSlot: async ({ lot, slot, arrivalWindowMinutes, plateNumber }) => {
        const booking = await createParkingReservation({
          lot,
          slot,
          arrivalWindowMinutes,
          plateNumber,
        });

        const notificationIds =
          booking.reservationId || booking.reservationCode
            ? [
                ...(await scheduleReservationConfirmationNotification({
                  reservationId: booking.reservationId ?? booking.reservationCode,
                  slotLabel: booking.slot.number,
                  expiresAt: booking.expiresAt ?? booking.createdAt,
                })),
                ...(await scheduleReservationReminderNotifications({
                  reservationId: booking.reservationId ?? booking.reservationCode,
                  slotLabel: booking.slot.number,
                  expiresAt: booking.expiresAt ?? booking.createdAt,
                })),
              ]
            : [];

        const nextState = {
          booking,
          session: null,
          completedSession: null,
          pendingPaymentIntentId: null,
          pendingPaymentMethodType: null,
          pendingPaymentQrImageUrl: null,
          reservationDraft: null,
          validationQrToken: '',
          scheduledNotificationIds: notificationIds,
          isRestoring: false,
        };

        set(nextState);

        await saveStoredWorkflowSnapshot(
          buildStoredWorkflowSnapshot(
            {
              stage: 'arrival',
              selectedSlotId: booking.slotId ?? booking.slot.id,
              selectedArrivalWindowMinutes: arrivalWindowMinutes,
              plateNumber,
              validationQrToken: '',
              createdReservation: booking.reservationId
                  ? ({
                      reservation_id: booking.reservationId,
                      slot_id: booking.slotId ?? booking.slot.id,
                      slot_label: booking.slot.number,
                      slot_status: booking.slot.status ?? 'reserved',
                      reservation_status: booking.reservationStatus ?? 'confirmed',
                      reserved_at: booking.createdAt,
                      expires_at: booking.expiresAt ?? booking.createdAt,
                      arrival_window_minutes: booking.arrivalWindowMinutes,
                      plate_number: booking.plateNumber,
                      reservation_fee: booking.reservationFee,
                      pricing_config: booking.pricingConfig,
                    } satisfies ReservationResult)
                : null,
              activeParkingSession: null,
              scheduledNotificationIds: notificationIds,
            },
            booking.reservationId ?? booking.reservationCode,
          ),
        );

        return booking;
      },
      issueWalkInEntryPass: async ({ lot, plateNumber, holdMinutes = 10 }) => {
        const booking = await issueWalkInEntryPassRequest({
          lot,
          plateNumber,
          holdMinutes,
        });

        set({
          booking,
          session: null,
          completedSession: null,
          pendingPaymentIntentId: null,
          pendingPaymentMethodType: null,
          pendingPaymentQrImageUrl: null,
          reservationDraft: null,
          validationQrToken: '',
          scheduledNotificationIds: [],
          isRestoring: false,
        });

        await saveStoredWorkflowSnapshot(
          buildStoredWorkflowSnapshot(
            {
              stage: 'arrival',
              selectedSlotId: null,
              selectedArrivalWindowMinutes: booking.arrivalWindowMinutes,
              plateNumber,
              validationQrToken: '',
              createdReservation: booking.reservationId
                ? ({
                    reservation_id: booking.reservationId,
                    slot_id: booking.slotId ?? null,
                    slot_label: booking.slotLabel ?? booking.slot.number,
                    slot_status: booking.slot.status ?? null,
                    reservation_status: booking.reservationStatus ?? 'confirmed',
                    source: 'walk_in',
                    walk_in_entry_token: booking.entryPassToken ?? null,
                    reserved_at: booking.createdAt,
                    expires_at: booking.expiresAt ?? booking.createdAt,
                    arrival_window_minutes: booking.arrivalWindowMinutes,
                    plate_number: booking.plateNumber,
                    reservation_fee: booking.reservationFee,
                    pricing_config: booking.pricingConfig,
                  } satisfies ReservationResult)
                : null,
              activeParkingSession: null,
              scheduledNotificationIds: [],
            },
            booking.reservationId ?? booking.reservationCode,
          ),
        );

        return booking;
      },
      refreshSession: async () => {
        const booking = get().booking;
        if (!booking?.reservationId) {
          return null;
        }

        const sessionRecord = await getParkingSessionByReservationId(booking.reservationId);
        if (!sessionRecord || sessionRecord.session_status === 'completed') {
          return null;
        }

        const session = mapSessionToParkingSession(sessionRecord, booking);
        if (get().scheduledNotificationIds.length > 0) {
          await cancelReservationNotifications(booking.reservationId, get().scheduledNotificationIds);
        }

        set({
          booking,
          session,
          completedSession: null,
          pendingPaymentIntentId: null,
          pendingPaymentMethodType: null,
          pendingPaymentQrImageUrl: null,
          reservationDraft: null,
          validationQrToken: '',
          scheduledNotificationIds: [],
        });

        await saveStoredWorkflowSnapshot(
          buildStoredWorkflowSnapshot(
            {
              stage: 'session',
              selectedSlotId: booking.source === 'walk_in' ? null : booking.slotId ?? booking.slot.id,
              selectedArrivalWindowMinutes: booking.arrivalWindowMinutes,
              plateNumber: booking.plateNumber,
              validationQrToken: '',
              createdReservation: null,
              activeParkingSession: sessionRecord,
              scheduledNotificationIds: [],
            },
            booking.reservationId,
          ),
        );

        return session;
      },
      clearExpiredEntryPass: async () => {
        const booking = get().booking;
        const expiresAt = booking?.expiresAt ? new Date(booking.expiresAt).getTime() : Number.NaN;
        if (!booking || !Number.isFinite(expiresAt) || expiresAt > Date.now()) {
          return;
        }

        set({
          booking: null,
          session: null,
          completedSession: null,
          pendingPaymentIntentId: null,
          pendingPaymentMethodType: null,
          pendingPaymentQrImageUrl: null,
          reservationDraft: null,
          validationQrToken: '',
          scheduledNotificationIds: [],
          isRestoring: false,
        });
        await clearStoredWorkflowSnapshot();
      },
      finishSession: async (durationSeconds) => {
        const session = get().session;

        if (!session) {
          return null;
        }

        let completedSession: CompletedSession;

        if (session.reservationCode.startsWith('WIN-')) {
          const endTime = new Date().toISOString();
          completedSession = {
            ...session,
            endTime,
            durationSeconds,
            totalBill: calculateBill(durationSeconds, session.pricingConfig),
            receiptNumber: createReceiptNumber(),
            transactionId: createTransactionId(),
            exitCode: createExitCode(session.slot.id),
            exitGraceEndsAt: new Date(
              new Date(endTime).getTime() + session.pricingConfig.exitGraceMinutes * 60 * 1000,
            ).toISOString(),
          };
        } else {
          const endRecords = await endParkingSession({
            reservationId: session.reservationId ?? session.reservationCode,
            paymentProvider: 'paymongo',
            paymentReference: 'pending_checkout',
            paymentStatus: 'pending',
          });

          if (endRecords && endRecords.length > 0) {
            completedSession = mapCompletedSession(endRecords[0], session);
          } else {
            const endTime = new Date().toISOString();
            completedSession = {
              ...session,
              endTime,
              durationSeconds,
              totalBill: calculateBill(durationSeconds, session.pricingConfig),
              receiptNumber: createReceiptNumber(),
              transactionId: createTransactionId(),
              exitCode: createExitCode(session.slot.id),
              exitGraceEndsAt: new Date(
                new Date(endTime).getTime() + session.pricingConfig.exitGraceMinutes * 60 * 1000,
              ).toISOString(),
            };
          }
        }

        await sendSessionCompletedNotification({
          slotLabel: completedSession.slot.number,
          billedAmount: completedSession.totalBill,
        });

        set({
          booking: null,
          session: null,
          completedSession,
          pendingPaymentIntentId: null,
          pendingPaymentMethodType: null,
          pendingPaymentQrImageUrl: null,
          reservationDraft: null,
          validationQrToken: '',
          scheduledNotificationIds: [],
        });

        await clearStoredWorkflowSnapshot();
        return completedSession;
      },
      cancelReservation: async () => {
        const { booking, scheduledNotificationIds } = get();

        if (!booking) {
          return;
        }

        if (booking.reservationId && !booking.reservationCode.startsWith('WIN-')) {
          await cancelParkingReservation({
            reservationId: booking.reservationId,
          });
        }

        if (booking.reservationId || booking.reservationCode) {
          await cancelReservationNotifications(
            booking.reservationId ?? booking.reservationCode,
            scheduledNotificationIds,
          );
        }

        set({
          booking: null,
          session: null,
          completedSession: null,
          pendingPaymentIntentId: null,
          pendingPaymentMethodType: null,
          pendingPaymentQrImageUrl: null,
          reservationDraft: null,
          validationQrToken: '',
          scheduledNotificationIds: [],
          isRestoring: false,
        });

        await clearStoredWorkflowSnapshot();
      },
      restoreWorkflow: async (lots) => {
        set({ isRestoring: true });

        try {
          const currentBooking = get().booking;
          const [storedWorkflow, backendWorkflow] = await Promise.all([
            loadStoredWorkflowSnapshot(),
            getCurrentMobileWorkflowState().catch(() => null),
          ]);

          if (backendWorkflow) {
            const preferredLot =
              lots.find((lot) => lot.id === backendWorkflow.session?.location_id)
              ?? lots.find((lot) => lot.id === backendWorkflow.reservation.location_id)
              ?? null;
            const resolved = findResolvedSlot(
              lots,
              backendWorkflow.reservation.slot_id,
              backendWorkflow.reservation.slot_label,
            );

            if (resolved || backendWorkflow.reservation.source === 'walk_in') {
              const booking = resolved
                ? buildBookingFromState({
                    lot: resolved.lot,
                    slot: resolved.slot,
                    reservation: backendWorkflow.reservation,
                  })
                : mapWalkInReservationToBooking(
                    {
                      ...backendWorkflow.reservation,
                      walk_in_entry_token:
                        currentBooking?.source === 'walk_in' && currentBooking.reservationId === backendWorkflow.reservation.reservation_id
                          ? currentBooking.entryPassToken ?? null
                          : storedWorkflow?.createdReservation?.reservation_id === backendWorkflow.reservation.reservation_id
                            ? storedWorkflow.createdReservation.walk_in_entry_token ?? null
                            : null,
                    },
                    preferredLot,
                  );

              const session = backendWorkflow.session
                ? mapSessionToParkingSession(
                    backendWorkflow.session,
                    {
                      ...booking,
                      plateNumber: backendWorkflow.session.plate_number || booking.plateNumber,
                    },
                  )
                : null;

              set({
                booking,
                session,
                completedSession: null,
                pendingPaymentIntentId: null,
                pendingPaymentMethodType: null,
                pendingPaymentQrImageUrl: null,
                reservationDraft: null,
                validationQrToken: storedWorkflow?.validationQrToken ?? '',
                scheduledNotificationIds: storedWorkflow?.scheduledNotificationIds ?? [],
                isRestoring: false,
              });

              await saveStoredWorkflowSnapshot(
                buildStoredWorkflowSnapshot(
                  {
                stage: session ? 'session' : 'arrival',
                selectedSlotId: booking.source === 'walk_in' ? null : booking.slotId ?? booking.slot.id,
                selectedArrivalWindowMinutes: storedWorkflow?.selectedArrivalWindowMinutes ?? booking.arrivalWindowMinutes,
                plateNumber: storedWorkflow?.plateNumber ?? booking.plateNumber,
                    validationQrToken: storedWorkflow?.validationQrToken ?? '',
                    createdReservation: backendWorkflow.reservation,
                    activeParkingSession: backendWorkflow.session,
                    scheduledNotificationIds: storedWorkflow?.scheduledNotificationIds ?? [],
                  },
                  backendWorkflow.reservation.reservation_id,
                ),
              );

              return;
            }
          }

          if (storedWorkflow?.createdReservation) {
            const preferredLot =
              lots.find((lot) => lot.id === storedWorkflow.createdReservation?.location_id)
              ?? null;
            const resolved = findResolvedSlot(
              lots,
              storedWorkflow.createdReservation.slot_id,
              storedWorkflow.createdReservation.slot_label,
            );

            if (resolved || storedWorkflow.createdReservation.source === 'walk_in') {
              const booking = resolved
                ? buildBookingFromState({
                    lot: resolved.lot,
                    slot: resolved.slot,
                    reservation: storedWorkflow.createdReservation,
                  })
                : mapWalkInReservationToBooking(
                    {
                      ...storedWorkflow.createdReservation,
                      walk_in_entry_token:
                        currentBooking?.source === 'walk_in' && currentBooking.reservationId === storedWorkflow.createdReservation.reservation_id
                          ? currentBooking.entryPassToken ?? null
                          : storedWorkflow.createdReservation.walk_in_entry_token ?? null,
                    },
                    preferredLot,
                  );
              const session = storedWorkflow.activeParkingSession
                ? mapSessionToParkingSession(
                    storedWorkflow.activeParkingSession,
                    {
                      ...booking,
                      plateNumber: storedWorkflow.plateNumber,
                    },
                  )
                : null;

              set({
                booking,
                session,
                completedSession: null,
                pendingPaymentIntentId: null,
                pendingPaymentMethodType: null,
                pendingPaymentQrImageUrl: null,
                reservationDraft: null,
                validationQrToken: storedWorkflow.validationQrToken ?? '',
                scheduledNotificationIds: storedWorkflow.scheduledNotificationIds ?? [],
                isRestoring: false,
              });

              return;
            }
          }

          set({ isRestoring: false });
        } catch {
          set({ isRestoring: false });
        }
      },
      setValidationQrToken: (value: string) => {
        set({ validationQrToken: value });
      },
      resetFlow: async () => {
        const { booking, scheduledNotificationIds } = get();

        if (booking?.reservationId || booking?.reservationCode) {
          await cancelReservationNotifications(booking.reservationId ?? booking.reservationCode, scheduledNotificationIds);
        }

        set({
          booking: null,
          session: null,
          completedSession: null,
          pendingPaymentIntentId: null,
          pendingPaymentMethodType: null,
          pendingPaymentQrImageUrl: null,
          reservationDraft: null,
          validationQrToken: '',
          scheduledNotificationIds: [],
          isRestoring: false,
        });

        await clearStoredWorkflowSnapshot();
      },
    }),
    {
      name: '@parking/mobile-flow',
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        booking: state.booking,
        session: state.session,
        completedSession: state.completedSession,
        reservationDraft: state.reservationDraft,
        validationQrToken: state.validationQrToken,
        scheduledNotificationIds: state.scheduledNotificationIds,
        isRestoring: state.isRestoring,
        pendingPaymentIntentId: state.pendingPaymentIntentId,
        pendingPaymentMethodType: state.pendingPaymentMethodType,
        pendingPaymentQrImageUrl: state.pendingPaymentQrImageUrl,
      }),
    },
  ),
);
