import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { calculateBill, createExitCode, createReceiptNumber, createTransactionId, createWalkInCode } from '../lib/flow';
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
  issueWalkInEntryPass as issueWalkInEntryPassRequest,
  mapCompletedSession,
  mapReservationToBooking,
  mapSessionToParkingSession,
  startParkingSession,
  startWalkInParkingSession,
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

interface StartWalkInSessionInput {
  lot: ParkingLot;
  slot: ParkingSlot;
  plateNumber: string;
}

interface IssueWalkInEntryPassInput {
  lot: ParkingLot;
  slot: ParkingSlot;
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
  reservationDraft: ReservationDraft | null;
  validationQrToken: string;
  scheduledNotificationIds: string[];
  isRestoring: boolean;
  hasHydrated: boolean;
  reserveSlot: (input: ReserveSlotInput) => Promise<Booking | null>;
  issueWalkInEntryPass: (input: IssueWalkInEntryPassInput) => Promise<Booking | null>;
  setReservationDraft: (draft: ReservationDraft) => void;
  clearReservationDraft: () => void;
  startSession: (slotQrToken?: string) => Promise<ParkingSession | null>;
  startWalkInSession: (input: StartWalkInSessionInput) => Promise<ParkingSession | null>;
  finishSession: (durationSeconds: number) => Promise<CompletedSession | null>;
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
      issueWalkInEntryPass: async ({ lot, slot, plateNumber, holdMinutes = 10 }) => {
        const booking = await issueWalkInEntryPassRequest({
          lot,
          slot,
          plateNumber,
          holdMinutes,
        });

        set({
          booking,
          session: null,
          completedSession: null,
          reservationDraft: null,
          validationQrToken: slot.qrToken ?? '',
          scheduledNotificationIds: [],
          isRestoring: false,
        });

        await saveStoredWorkflowSnapshot(
          buildStoredWorkflowSnapshot(
            {
              stage: 'arrival',
              selectedSlotId: booking.slotId ?? booking.slot.id,
              selectedArrivalWindowMinutes: booking.arrivalWindowMinutes,
              plateNumber,
              validationQrToken: slot.qrToken ?? '',
              createdReservation: booking.reservationId
                ? ({
                    reservation_id: booking.reservationId,
                    slot_id: booking.slotId ?? booking.slot.id,
                    slot_label: booking.slot.number,
                    slot_status: booking.slot.status ?? 'reserved',
                    reservation_status: booking.reservationStatus ?? 'confirmed',
                    source: 'walk_in',
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
      startSession: async (slotQrToken?: string) => {
        const booking = get().booking;

        if (!booking) {
          return null;
        }

        const validationToken = (slotQrToken ?? get().validationQrToken ?? booking.qrToken ?? booking.slot.qrToken ?? '').trim();

        const sessionRecords = await startParkingSession({
          reservationId: booking.reservationId ?? booking.reservationCode,
          slotQrToken: validationToken || null,
        });

        if (get().scheduledNotificationIds.length > 0) {
          await cancelReservationNotifications(
            booking.reservationId ?? booking.reservationCode,
            get().scheduledNotificationIds,
          );
        }

        let session: ParkingSession;

        if (sessionRecords && sessionRecords.length > 0) {
          const current = sessionRecords[0];
          session = {
            ...booking,
            sessionId: current.session_id,
            sessionStatus: current.session_status,
            startTime: current.started_at,
            startedAt: current.started_at,
            validatedAt: current.validated_at,
            billedMinutes: current.billed_minutes,
            billedAmount: current.billed_amount,
            paymentStatus: current.payment_status,
          };
        } else {
          session = {
            ...booking,
            startTime: new Date().toISOString(),
          };
        }

        set({
          booking,
          session,
          completedSession: null,
          reservationDraft: null,
          validationQrToken: validationToken,
          scheduledNotificationIds: [],
        });

        await saveStoredWorkflowSnapshot(
          buildStoredWorkflowSnapshot(
            {
              stage: 'session',
              selectedSlotId: booking.slotId ?? booking.slot.id,
              selectedArrivalWindowMinutes: booking.arrivalWindowMinutes,
              plateNumber: booking.plateNumber,
              validationQrToken: validationToken,
              createdReservation: booking.reservationId
                  ? ({
                      reservation_id: booking.reservationId,
                      slot_id: booking.slotId ?? booking.slot.id,
                      slot_label: booking.slot.number,
                      slot_status: booking.slot.status ?? 'occupied',
                      reservation_status: booking.reservationStatus ?? 'confirmed',
                      reserved_at: booking.createdAt,
                      expires_at: booking.expiresAt ?? booking.createdAt,
                      arrival_window_minutes: booking.arrivalWindowMinutes,
                      plate_number: booking.plateNumber,
                      reservation_fee: booking.reservationFee,
                    } satisfies ReservationResult)
                : null,
              activeParkingSession: sessionRecords && sessionRecords.length > 0
                ? sessionRecords[0]
                : ({
                    session_id: session.sessionId ?? booking.reservationId ?? booking.reservationCode,
                    reservation_id: booking.reservationId ?? booking.reservationCode,
                    slot_id: booking.slotId ?? booking.slot.id,
                    slot_label: booking.slot.number,
                    slot_status: booking.slot.status ?? 'occupied',
                    reservation_status: booking.reservationStatus ?? 'confirmed',
                    session_status: session.sessionStatus ?? 'active',
                    started_at: session.startedAt ?? session.startTime,
                    validated_at: session.validatedAt ?? session.startedAt ?? session.startTime,
                    ended_at: null,
                    plate_number: booking.plateNumber,
                    reservation_fee: booking.reservationFee,
                    billed_minutes: session.billedMinutes ?? null,
                    billed_amount: session.billedAmount ?? null,
                    payment_status: session.paymentStatus ?? null,
                    pricing_config: booking.pricingConfig,
                  } satisfies ParkingSessionResult),
              scheduledNotificationIds: [],
            },
            booking.reservationId ?? booking.reservationCode,
          ),
        );

        return session;
      },
      startWalkInSession: async ({ lot, slot, plateNumber }) => {
        const existingBooking = get().booking;

        if (existingBooking?.source === 'walk_in' && existingBooking.reservationId && existingBooking.slot.id === slot.id) {
          const sessionRecords = await startWalkInParkingSession({
            reservationId: existingBooking.reservationId,
            slotQrToken: slot.qrToken ?? existingBooking.qrToken ?? null,
          });

          if (sessionRecords && sessionRecords.length > 0) {
            const current = sessionRecords[0];
            const session: ParkingSession = {
              ...existingBooking,
              sessionId: current.session_id,
              sessionStatus: current.session_status,
              startTime: current.started_at,
              startedAt: current.started_at,
              validatedAt: current.validated_at,
              billedMinutes: current.billed_minutes,
              billedAmount: current.billed_amount,
              paymentStatus: current.payment_status,
            };

            set({
              booking: existingBooking,
              session,
              completedSession: null,
              reservationDraft: null,
              validationQrToken: slot.qrToken ?? existingBooking.qrToken ?? '',
              scheduledNotificationIds: [],
            });

            await saveStoredWorkflowSnapshot(
              buildStoredWorkflowSnapshot(
                {
                  stage: 'session',
                  selectedSlotId: existingBooking.slotId ?? existingBooking.slot.id,
                  selectedArrivalWindowMinutes: existingBooking.arrivalWindowMinutes,
                  plateNumber: existingBooking.plateNumber,
                  validationQrToken: slot.qrToken ?? existingBooking.qrToken ?? '',
                  createdReservation: existingBooking.reservationId
                    ? ({
                        reservation_id: existingBooking.reservationId,
                        slot_id: existingBooking.slotId ?? existingBooking.slot.id,
                        slot_label: existingBooking.slot.number,
                        slot_status: existingBooking.slot.status ?? 'occupied',
                        reservation_status: existingBooking.reservationStatus ?? 'confirmed',
                        source: 'walk_in',
                        reserved_at: existingBooking.createdAt,
                        expires_at: existingBooking.expiresAt ?? existingBooking.createdAt,
                        arrival_window_minutes: existingBooking.arrivalWindowMinutes,
                        plate_number: existingBooking.plateNumber,
                        reservation_fee: existingBooking.reservationFee,
                        pricing_config: existingBooking.pricingConfig,
                      } satisfies ReservationResult)
                    : null,
                  activeParkingSession: sessionRecords[0],
                  scheduledNotificationIds: [],
                },
                existingBooking.reservationId ?? existingBooking.reservationCode,
              ),
            );

            return session;
          }
        }

        const startTime = new Date().toISOString();
        const reservationCode = createWalkInCode(slot.id);

        const session: ParkingSession = {
          reservationCode,
          source: 'walk_in',
          lotId: lot.id,
          lotName: lot.name,
          address: lot.address,
          slotId: slot.id,
          slotLabel: slot.number,
          slot,
          arrivalWindowMinutes: 0,
          plateNumber,
          reservationFee: 0,
          pricePerHour: lot.pricePerHour,
          pricingConfig: lot.pricingConfig,
          qrToken: slot.qrToken ?? null,
          createdAt: startTime,
          startTime,
          startedAt: startTime,
          validatedAt: startTime,
          sessionStatus: 'active',
        };

        set({
          booking: null,
          session,
          completedSession: null,
          reservationDraft: null,
          validationQrToken: slot.qrToken ?? '',
          scheduledNotificationIds: [],
        });

        return session;
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
          const [storedWorkflow, backendWorkflow] = await Promise.all([
            loadStoredWorkflowSnapshot(),
            getCurrentMobileWorkflowState().catch(() => null),
          ]);

          if (backendWorkflow) {
            const resolved = findResolvedSlot(
              lots,
              backendWorkflow.reservation.slot_id,
              backendWorkflow.reservation.slot_label,
            );

            if (resolved) {
              const booking = buildBookingFromState({
                lot: resolved.lot,
                slot: resolved.slot,
                reservation: backendWorkflow.reservation,
              });

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
                reservationDraft: null,
                validationQrToken: storedWorkflow?.validationQrToken ?? '',
                scheduledNotificationIds: storedWorkflow?.scheduledNotificationIds ?? [],
                isRestoring: false,
              });

              await saveStoredWorkflowSnapshot(
                buildStoredWorkflowSnapshot(
                  {
                stage: session ? 'session' : 'arrival',
                selectedSlotId: booking.slotId ?? booking.slot.id,
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
            const resolved = findResolvedSlot(
              lots,
              storedWorkflow.createdReservation.slot_id,
              storedWorkflow.createdReservation.slot_label,
            );

            if (resolved) {
              const booking = buildBookingFromState({
                lot: resolved.lot,
                slot: resolved.slot,
                reservation: storedWorkflow.createdReservation,
              });
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
      }),
    },
  ),
);
