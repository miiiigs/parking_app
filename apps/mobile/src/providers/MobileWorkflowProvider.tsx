import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useMobileAuth } from './MobileAuthProvider';
import { DEFAULT_ARRIVAL_WINDOW_MINUTES, ARRIVAL_WINDOW_OPTIONS } from '../lib/reservationOptions';
import { buildParkingBillBreakdown } from '../lib/billing';
import {
  clearStoredWorkflowSnapshot,
  loadStoredWorkflowSnapshot,
  saveStoredWorkflowSnapshot,
} from '../lib/workflowStorage';
import {
  cancelReservationNotifications,
  cancelScheduledNotifications,
  ensureParkingNotificationsEnabled,
  getParkingNotificationReadiness,
  hasScheduledReservationNotifications,
  scheduleReservationConfirmationNotification,
  scheduleReservationFollowUpNotifications,
  sendSessionCompletedNotification,
} from '../lib/notifications';
import {
  createParkingReservation,
  endParkingSession,
  getCurrentMobileWorkflowState,
  getParkingReservationById,
  getParkingSessionByReservationId,
  startParkingSession,
  type ParkingSessionResult,
  type ReservationResult,
} from '../lib/reservations';
import {
  getFallbackParkingData,
  loadParkingDashboardData,
  type ParkingDashboardData,
} from '../lib/parkingData';
// @ts-expect-error JS helper used for Node test coverage and shared runtime logic.
import { buildStoredWorkflowSnapshot, getNextSelectedSlotId } from '../lib/workflowLogic';
// @ts-expect-error JS helper used for Node test coverage and shared runtime logic.
import { buildOfflineRecoveryPatch, shouldScheduleReservationFollowUpNotifications } from '../lib/workflowRecovery';
// @ts-expect-error JS helper used for Node test coverage and shared runtime logic.
import { workflowReducer as applyWorkflowAction } from '../lib/workflowReducer';

type Stage = 'home' | 'reserve' | 'validate' | 'session';
type Operation = 'idle' | 'refreshing' | 'creatingReservation' | 'startingSession' | 'endingSession';
type ConnectionState = 'booting' | 'live' | 'degraded' | 'offline';

type NotificationReadinessState = {
  label: string;
  message: string;
};

type WorkflowState = {
  stage: Stage;
  selectedSlotId: string | null;
  selectedArrivalWindowMinutes: number;
  plateNumber: string;
  validationQrToken: string;
  scheduledNotificationIds: string[];
  reservationError: string | null;
  createdReservation: ReservationResult | null;
  activeParkingSession: ParkingSessionResult | null;
  operation: Operation;
  connectionState: ConnectionState;
  connectionMessage: string | null;
};

type WorkflowAction = {
  type: 'patch';
  patch: Partial<WorkflowState>;
};

const initialWorkflowState: WorkflowState = {
  stage: 'home',
  selectedSlotId: null,
  selectedArrivalWindowMinutes: DEFAULT_ARRIVAL_WINDOW_MINUTES,
  plateNumber: 'ABC-1234',
  validationQrToken: '',
  scheduledNotificationIds: [],
  reservationError: null,
  createdReservation: null,
  activeParkingSession: null,
  operation: 'idle',
  connectionState: 'booting',
  connectionMessage: 'Syncing live parking data...',
};

const initialNotificationReadinessState: NotificationReadinessState = {
  label: 'Checking reminders',
  message: 'Checking whether parking reminders are available on this device...',
};

type MobileWorkflowContextValue = {
  workflow: WorkflowState;
  parkingData: ParkingDashboardData;
  notificationReadiness: NotificationReadinessState;
  isRefreshingBackend: boolean;
  isSubmittingReservation: boolean;
  isStartingSession: boolean;
  isEndingSession: boolean;
  isCheckingNotifications: boolean;
  activeLocation: ParkingDashboardData['location'];
  currentReservation: ReservationResult | null;
  currentSession: ParkingSessionResult | null;
  activeSlot: ParkingDashboardData['slots'][number] | undefined;
  slotCountLabel: string;
  isLiveData: boolean;
  selectedArrivalWindowLabel: string;
  createdReservationSlotLabel: string;
  connectionBannerMessage: string | null;
  setStage: (stage: Stage) => void;
  setSelectedSlotId: (slotId: string | null) => void;
  setSelectedArrivalWindowMinutes: (minutes: number) => void;
  setPlateNumber: (plateNumber: string) => void;
  setValidationQrToken: (value: string) => void;
  refreshBackend: () => Promise<void>;
  retryBackendSync: () => Promise<void>;
  enableNotifications: () => Promise<void>;
  createReservation: () => Promise<void>;
  startSession: (slotQrTokenOverride?: string) => Promise<void>;
  endSession: () => Promise<void>;
  returnHome: () => Promise<void>;
  openReservationFlow: () => void;
  openValidationFlow: () => void;
  openSessionFlow: () => void;
};

const MobileWorkflowContext = createContext<MobileWorkflowContextValue | null>(null);

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  return applyWorkflowAction(state, action);
}

export function MobileWorkflowProvider({ children }: { children: React.ReactNode }) {
  const { user } = useMobileAuth();
  const [workflow, dispatchWorkflow] = useReducer(workflowReducer, initialWorkflowState);
  const [parkingData, setParkingData] = useState<ParkingDashboardData>(getFallbackParkingData());
  const [notificationReadiness, setNotificationReadiness] = useState<NotificationReadinessState>(initialNotificationReadinessState);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isCheckingNotifications, setIsCheckingNotifications] = useState(false);
  const [isRefreshingBackend, setIsRefreshingBackend] = useState(false);
  const syncInProgressRef = useRef(false);
  const hasBootstrappedRef = useRef(false);
  const workflowRef = useRef(workflow);
  const retryBackoffRef = useRef<number>(0);
  const lastFailedAtRef = useRef<number | null>(null);
  const telemetryRef = useRef({ polls: 0, realtimeEvents: 0, errors: 0 });

  useEffect(() => {
    workflowRef.current = workflow;
  }, [workflow]);

  const cancelReminderNotifications = useCallback(async () => {
    const currentWorkflow = workflowRef.current;
    const reservationId = currentWorkflow.createdReservation?.reservation_id ?? currentWorkflow.activeParkingSession?.reservation_id ?? '';

    if (reservationId) {
      await cancelReservationNotifications(reservationId, currentWorkflow.scheduledNotificationIds);
    } else if (currentWorkflow.scheduledNotificationIds.length > 0) {
      await cancelScheduledNotifications(currentWorkflow.scheduledNotificationIds);
    }

    dispatchWorkflow({
      type: 'patch',
      patch: {
        scheduledNotificationIds: [],
      },
    });
  }, []);

  const persistCurrentWorkflowSnapshot = useCallback(async (nextScheduledNotificationIds?: string[]) => {
    const currentWorkflow = workflowRef.current;
    const reservationId = currentWorkflow.createdReservation?.reservation_id ?? currentWorkflow.activeParkingSession?.reservation_id ?? null;

    if (currentWorkflow.stage === 'home' && !reservationId) {
      await clearStoredWorkflowSnapshot();
      return;
    }

    await saveStoredWorkflowSnapshot(
      buildStoredWorkflowSnapshot(
        {
          ...currentWorkflow,
          scheduledNotificationIds: nextScheduledNotificationIds ?? currentWorkflow.scheduledNotificationIds,
        },
        reservationId,
      ),
    );
  }, []);

  const refreshNotificationReadiness = useCallback(async () => {
    if (isCheckingNotifications) {
      return;
    }

    setIsCheckingNotifications(true);

    try {
      const readiness = await getParkingNotificationReadiness();
      setNotificationReadiness({
        label: readiness.label,
        message: readiness.message,
      });
    } finally {
      setIsCheckingNotifications(false);
    }
  }, [isCheckingNotifications]);

  const enableNotifications = useCallback(async () => {
    if (isCheckingNotifications) {
      return;
    }

    setIsCheckingNotifications(true);

    try {
      const notificationsEnabled = await ensureParkingNotificationsEnabled();

      if (notificationsEnabled) {
        setNotificationReadiness({
          label: 'Reminders enabled',
          message: 'Parking reminders are enabled on this device.',
        });
        return;
      }

      const readiness = await getParkingNotificationReadiness();
      setNotificationReadiness({
        label: readiness.label,
        message: readiness.message,
      });
    } finally {
      setIsCheckingNotifications(false);
    }
  }, [isCheckingNotifications]);

  const scheduleFollowUpNotificationsOnBackground = useCallback(async () => {
    const currentWorkflow = workflowRef.current;
    const currentReservation = currentWorkflow.createdReservation;
    const reservationId = currentReservation?.reservation_id;

    if (!reservationId) {
      return;
    }

    const alreadyScheduledReservationNotifications = await hasScheduledReservationNotifications(reservationId, ['reservation-expiry-reminder', 'reservation-expired']);

    if (!shouldScheduleReservationFollowUpNotifications(currentWorkflow, alreadyScheduledReservationNotifications)) {
      return;
    }

    const reminderIds = await scheduleReservationFollowUpNotifications({
      reservationId,
      slotLabel:
        parkingData.slots.find((slot) => slot.id === currentReservation?.slot_id)?.label ?? 'Assigned slot',
      expiresAt: currentReservation.expires_at,
    });

    if (reminderIds.length > 0) {
      dispatchWorkflow({
        type: 'patch',
        patch: {
          scheduledNotificationIds: [...currentWorkflow.scheduledNotificationIds, ...reminderIds],
        },
      });

      await persistCurrentWorkflowSnapshot([...currentWorkflow.scheduledNotificationIds, ...reminderIds]);
    }
  }, [parkingData.slots, persistCurrentWorkflowSnapshot]);

  const refreshFromBackend = useCallback(async () => {
    if (!user || syncInProgressRef.current) {
      return;
    }

    syncInProgressRef.current = true;
    setIsRefreshingBackend(true);

    try {
      const refreshedParkingData = await loadParkingDashboardData();
      setParkingData(refreshedParkingData);

      dispatchWorkflow({
        type: 'patch',
        patch: {
          connectionState: refreshedParkingData.isLiveData ? 'live' : 'degraded',
          connectionMessage: refreshedParkingData.isLiveData
            ? null
            : 'Using fallback parking data until Supabase becomes available again. Tap Retry to check for live data.',
        },
      });

      const currentWorkflow = workflowRef.current;
      const currentSelectedSlotId = currentWorkflow.selectedSlotId;
      const resolvedSelectedSlotId = getNextSelectedSlotId(refreshedParkingData.slots, currentSelectedSlotId);

      if (resolvedSelectedSlotId !== currentSelectedSlotId) {
        dispatchWorkflow({
          type: 'patch',
          patch: {
            selectedSlotId: resolvedSelectedSlotId,
          },
        });
      }

      const currentWorkflowReservationId =
        currentWorkflow.createdReservation?.reservation_id ?? currentWorkflow.activeParkingSession?.reservation_id ?? null;

      if (currentWorkflowReservationId) {
        const latestReservation = await getParkingReservationById(currentWorkflowReservationId);

        if (!latestReservation) {
          await cancelReminderNotifications();
          await clearStoredWorkflowSnapshot();
          dispatchWorkflow({
            type: 'patch',
            patch: {
              stage: 'home',
              createdReservation: null,
              activeParkingSession: null,
              validationQrToken: '',
              reservationError: 'Reservation was removed from the database.',
              operation: 'idle',
            },
          });
          return;
        }

        dispatchWorkflow({
          type: 'patch',
          patch: {
            createdReservation: latestReservation,
            reservationError: null,
          },
        });

        const latestSession = await getParkingSessionByReservationId(currentWorkflowReservationId);

        if (latestSession) {
          await cancelReservationNotifications(currentWorkflowReservationId, currentWorkflow.scheduledNotificationIds);
          dispatchWorkflow({
            type: 'patch',
            patch: {
              activeParkingSession: latestSession,
              stage: 'session',
              scheduledNotificationIds: [],
            },
          });
        } else {
          dispatchWorkflow({
            type: 'patch',
            patch: {
              activeParkingSession: null,
              stage: 'validate',
            },
          });
        }
      } else if (!hasBootstrappedRef.current) {
        const restoredWorkflow = await getCurrentMobileWorkflowState();

        if (restoredWorkflow) {
          const storedWorkflow = await loadStoredWorkflowSnapshot();

          dispatchWorkflow({
            type: 'patch',
            patch: {
              createdReservation: restoredWorkflow.reservation,
              activeParkingSession: restoredWorkflow.session,
              validationQrToken:
                refreshedParkingData.slots.find((slot) => slot.id === restoredWorkflow.reservation.slot_id)?.qrToken ?? '',
              reservationError: null,
              stage: restoredWorkflow.session ? 'session' : 'validate',
              scheduledNotificationIds: storedWorkflow?.scheduledNotificationIds ?? [],
            },
          });

          if (restoredWorkflow.session) {
            await cancelReservationNotifications(restoredWorkflow.reservation.reservation_id, storedWorkflow?.scheduledNotificationIds ?? []);
          }
        } else {
          const storedWorkflow = await loadStoredWorkflowSnapshot();

          if (storedWorkflow && storedWorkflow.stage !== 'home' && storedWorkflow.stage !== 'reserve') {
            dispatchWorkflow({
              type: 'patch',
              patch: {
                stage: storedWorkflow.stage,
                selectedSlotId: getNextSelectedSlotId(refreshedParkingData.slots, storedWorkflow.selectedSlotId),
                selectedArrivalWindowMinutes: storedWorkflow.selectedArrivalWindowMinutes,
                plateNumber: storedWorkflow.plateNumber,
                validationQrToken: storedWorkflow.validationQrToken,
                createdReservation: storedWorkflow.createdReservation,
                activeParkingSession: storedWorkflow.activeParkingSession,
                scheduledNotificationIds: storedWorkflow.scheduledNotificationIds,
                reservationError: null,
              },
            });
          }
        }
      }

      retryBackoffRef.current = 0;
      lastFailedAtRef.current = null;
    } catch {
      telemetryRef.current.errors += 1;
      const previous = retryBackoffRef.current || 0;
      const next = previous > 0 ? Math.min(120000, previous * 2) : 5000;
      retryBackoffRef.current = next;
      lastFailedAtRef.current = Date.now();
      const storedWorkflow = await loadStoredWorkflowSnapshot();
      const fallbackParkingData = getFallbackParkingData();
      setParkingData(fallbackParkingData);

      const currentWorkflow = workflowRef.current;
      const recoveryPatch = buildOfflineRecoveryPatch({
        fallbackSlots: fallbackParkingData.slots,
        storedWorkflow,
        currentStage: currentWorkflow.stage,
      });

      dispatchWorkflow({
        type: 'patch',
        patch: recoveryPatch,
      });
    } finally {
      syncInProgressRef.current = false;
      setIsRefreshingBackend(false);
      hasBootstrappedRef.current = true;
    }
  }, [cancelReminderNotifications, user]);

  const retryBackendSync = useCallback(async () => {
    await refreshFromBackend();
    await refreshNotificationReadiness();
  }, [refreshFromBackend, refreshNotificationReadiness]);

  const handleCreateReservation = useCallback(async () => {
    const currentWorkflow = workflowRef.current;
    const selectedArrivalWindow =
      ARRIVAL_WINDOW_OPTIONS.find((option) => option.minutes === currentWorkflow.selectedArrivalWindowMinutes) ?? ARRIVAL_WINDOW_OPTIONS[1];

    if (!parkingData.isLiveData) {
      dispatchWorkflow({
        type: 'patch',
        patch: {
          reservationError: 'Live backend data is unavailable. Connect Supabase before creating reservations.',
        },
      });
      return;
    }

    if (!currentWorkflow.selectedSlotId) {
      dispatchWorkflow({
        type: 'patch',
        patch: {
          reservationError: 'Select a slot before confirming the reservation.',
        },
      });
      return;
    }

    if (!currentWorkflow.plateNumber.trim()) {
      dispatchWorkflow({
        type: 'patch',
        patch: {
          reservationError: 'Enter a plate number before confirming the reservation.',
        },
      });
      return;
    }

    setIsSubmittingReservation(true);
    dispatchWorkflow({
      type: 'patch',
      patch: {
        operation: 'creatingReservation',
        reservationError: null,
      },
    });

    try {
      const reservationRecords = await createParkingReservation({
        slotId: currentWorkflow.selectedSlotId,
        arrivalWindowMinutes: selectedArrivalWindow.minutes,
        plateNumber: currentWorkflow.plateNumber.trim().toUpperCase(),
      });

      const reservation = reservationRecords[0] ?? null;

      if (!reservation) {
        throw new Error('Reservation was created but no record was returned.');
      }

      const confirmationNotificationIds = await scheduleReservationConfirmationNotification({
        reservationId: reservation.reservation_id,
        slotLabel: parkingData.slots.find((slot) => slot.id === reservation.slot_id)?.label ?? 'Assigned slot',
        expiresAt: reservation.expires_at,
      });

      dispatchWorkflow({
        type: 'patch',
        patch: {
          createdReservation: reservation,
          activeParkingSession: null,
          validationQrToken: parkingData.slots.find((slot) => slot.id === reservation.slot_id)?.qrToken ?? '',
          stage: 'validate',
          reservationError: null,
          operation: 'idle',
          scheduledNotificationIds: confirmationNotificationIds,
        },
      });

      await persistCurrentWorkflowSnapshot(confirmationNotificationIds);
      await refreshFromBackend();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create reservation.';
      dispatchWorkflow({
        type: 'patch',
        patch: {
          reservationError: message,
          operation: 'idle',
        },
      });
    } finally {
      setIsSubmittingReservation(false);
    }
  }, [parkingData.isLiveData, parkingData.slots, persistCurrentWorkflowSnapshot, refreshFromBackend]);

  const handleStartSession = useCallback(async (slotQrTokenOverride?: string) => {
    const currentWorkflow = workflowRef.current;
    const currentReservation = currentWorkflow.createdReservation;

    if (!currentReservation) {
      dispatchWorkflow({
        type: 'patch',
        patch: {
          reservationError: 'Create a reservation before starting a parking session.',
          stage: 'reserve',
        },
      });
      return;
    }

    setIsStartingSession(true);
    dispatchWorkflow({
      type: 'patch',
      patch: {
        operation: 'startingSession',
        reservationError: null,
      },
    });

    const tokenToUse = (slotQrTokenOverride ?? currentWorkflow.validationQrToken).trim();

    try {
      const sessionRecords = await startParkingSession({
        reservationId: currentReservation.reservation_id,
        slotQrToken: tokenToUse || null,
      });

      const session = Array.isArray(sessionRecords) ? sessionRecords[0] ?? null : sessionRecords;

      if (!session) {
        throw new Error('Session validation succeeded but no session record was returned.');
      }

      await cancelReminderNotifications();

      dispatchWorkflow({
        type: 'patch',
        patch: {
          activeParkingSession: session,
          stage: 'session',
          validationQrToken: tokenToUse,
          reservationError: null,
          operation: 'idle',
          scheduledNotificationIds: [],
        },
      });

      await refreshFromBackend();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start parking session.';
      dispatchWorkflow({
        type: 'patch',
        patch: {
          reservationError: message,
          operation: 'idle',
        },
      });
    } finally {
      setIsStartingSession(false);
    }
  }, [cancelReminderNotifications, refreshFromBackend]);

  const handleEndSession = useCallback(async () => {
    const currentWorkflow = workflowRef.current;
    const currentReservation = currentWorkflow.createdReservation;
    const currentSession = currentWorkflow.activeParkingSession;

    if (!currentReservation) {
      dispatchWorkflow({
        type: 'patch',
        patch: {
          stage: 'home',
          reservationError: null,
        },
      });
      return;
    }

    if (currentSession?.session_status === 'completed') {
      await clearStoredWorkflowSnapshot();
      await cancelReminderNotifications();
      dispatchWorkflow({
        type: 'patch',
        patch: {
          stage: 'home',
          createdReservation: null,
          activeParkingSession: null,
          validationQrToken: '',
          reservationError: null,
          operation: 'idle',
          scheduledNotificationIds: [],
        },
      });
      return;
    }

    setIsEndingSession(true);
    dispatchWorkflow({
      type: 'patch',
      patch: {
        operation: 'endingSession',
        reservationError: null,
      },
    });

    try {
      const parkingBill = buildParkingBillBreakdown({
        startedAt: currentSession?.started_at ?? null,
        reservationFee: Number(currentSession?.reservation_fee ?? 0),
      });

      const sessionRecords = await endParkingSession({
        reservationId: currentReservation.reservation_id,
        billedAmount: parkingBill.total,
        billedMinutes: parkingBill.elapsedMinutes,
      });

      const session = Array.isArray(sessionRecords) ? sessionRecords[0] ?? null : sessionRecords;

      if (!session) {
        throw new Error('Session completion succeeded but no session record was returned.');
      }

      await cancelReminderNotifications();
      await sendSessionCompletedNotification({
        slotLabel: currentReservation?.slot_label ?? 'Assigned slot',
        billedAmount: Number(session.billed_amount ?? session.reservation_fee ?? 0),
      });

      dispatchWorkflow({
        type: 'patch',
        patch: {
          activeParkingSession: session,
          stage: 'session',
          reservationError: null,
          operation: 'idle',
          scheduledNotificationIds: [],
        },
      });

      await refreshFromBackend();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete parking session.';
      dispatchWorkflow({
        type: 'patch',
        patch: {
          reservationError: message,
          operation: 'idle',
        },
      });
    } finally {
      setIsEndingSession(false);
    }
  }, [cancelReminderNotifications, refreshFromBackend]);

  const refreshNotificationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) {
      setParkingData(getFallbackParkingData());
      setNotificationReadiness(initialNotificationReadinessState);
      dispatchWorkflow({ type: 'patch', patch: initialWorkflowState });
      hasBootstrappedRef.current = false;
      return;
    }

    void refreshFromBackend();
    void refreshNotificationReadiness();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void refreshFromBackend();
        void refreshNotificationReadiness();
      } else if (nextAppState === 'background') {
        void scheduleFollowUpNotificationsOnBackground();
      }
    });

    refreshNotificationTimer.current = setInterval(() => {
      if (syncInProgressRef.current) {
        return;
      }

      const currentWorkflow = workflowRef.current;
      const hasActive = Boolean(currentWorkflow.createdReservation || currentWorkflow.activeParkingSession);
      if (!hasActive && telemetryRef.current.realtimeEvents > 0) {
        return;
      }

      telemetryRef.current.polls += 1;
      void refreshFromBackend();
    }, 60000);

    return () => {
      subscription.remove();
      if (refreshNotificationTimer.current) {
        clearInterval(refreshNotificationTimer.current);
        refreshNotificationTimer.current = null;
      }
    };
  }, [refreshFromBackend, refreshNotificationReadiness, scheduleFollowUpNotificationsOnBackground, user]);

  useEffect(() => {
    if (!hasBootstrappedRef.current) {
      return;
    }

    const currentReservationId = workflow.createdReservation?.reservation_id ?? workflow.activeParkingSession?.reservation_id ?? null;

    if (workflow.stage === 'home' && !currentReservationId) {
      void clearStoredWorkflowSnapshot();
      return;
    }

    if (workflow.stage === 'reserve') {
      void clearStoredWorkflowSnapshot();
      return;
    }

    void saveStoredWorkflowSnapshot(buildStoredWorkflowSnapshot(workflow, currentReservationId));
  }, [
    workflow.activeParkingSession?.reservation_id,
    workflow.activeParkingSession,
    workflow.createdReservation,
    workflow.createdReservation?.reservation_id,
    workflow.plateNumber,
    workflow.validationQrToken,
    workflow.selectedArrivalWindowMinutes,
    workflow.selectedSlotId,
    workflow.stage,
  ]);

  const activeLocation = parkingData.location;
  const currentReservation = workflow.createdReservation;
  const currentSession = workflow.activeParkingSession;
  const currentSessionSlotId = currentSession?.slot_id ?? currentReservation?.slot_id ?? null;
  const activeSlot = currentSessionSlotId
    ? parkingData.slots.find((slot) => slot.id === currentSessionSlotId) ?? parkingData.slots[0]
    : parkingData.slots[0];
  const slotCountLabel = workflow.connectionState === 'booting' ? 'Syncing live slot board...' : `${parkingData.slots.length} controlled slots`;
  const isLiveData = parkingData.isLiveData;
  const selectedArrivalWindow =
    ARRIVAL_WINDOW_OPTIONS.find((option) => option.minutes === workflow.selectedArrivalWindowMinutes) ?? ARRIVAL_WINDOW_OPTIONS[1];
  const selectedArrivalWindowLabel = selectedArrivalWindow.label;
  const createdReservationSlotLabel = currentReservation
    ? parkingData.slots.find((slot) => slot.id === currentReservation.slot_id)?.label ?? 'Assigned slot'
    : 'Assigned slot';

  const connectionBannerMessage =
    workflow.connectionState === 'booting'
      ? workflow.connectionMessage ?? 'Syncing live parking data...'
      : workflow.connectionState === 'offline'
        ? workflow.connectionMessage ?? 'Live backend is unavailable. Using fallback data.'
        : workflow.connectionState === 'degraded'
          ? workflow.connectionMessage ?? 'Operating with fallback parking data.'
          : null;

  const setStage = useCallback((stage: Stage) => {
    dispatchWorkflow({ type: 'patch', patch: { stage } });
  }, []);

  const setSelectedSlotId = useCallback((selectedSlotId: string | null) => {
    dispatchWorkflow({ type: 'patch', patch: { selectedSlotId } });
  }, []);

  const setSelectedArrivalWindowMinutes = useCallback((selectedArrivalWindowMinutes: number) => {
    dispatchWorkflow({ type: 'patch', patch: { selectedArrivalWindowMinutes } });
  }, []);

  const setPlateNumber = useCallback((plateNumber: string) => {
    dispatchWorkflow({ type: 'patch', patch: { plateNumber } });
  }, []);

  const setValidationQrToken = useCallback((validationQrToken: string) => {
    dispatchWorkflow({ type: 'patch', patch: { validationQrToken } });
  }, []);

  const openReservationFlow = useCallback(() => {
    dispatchWorkflow({ type: 'patch', patch: { stage: 'reserve', reservationError: null } });
  }, []);

  const openValidationFlow = useCallback(() => {
    dispatchWorkflow({
      type: 'patch',
      patch: {
        stage: currentReservation ? 'validate' : 'reserve',
        reservationError: currentReservation ? null : 'Create a reservation first.',
      },
    });
  }, [currentReservation]);

  const openSessionFlow = useCallback(() => {
    dispatchWorkflow({
      type: 'patch',
      patch: {
        stage: currentSession ? 'session' : currentReservation ? 'validate' : 'reserve',
        reservationError: currentSession || currentReservation ? null : 'No active parking session is available right now.',
      },
    });
  }, [currentReservation, currentSession]);

  const value = useMemo<MobileWorkflowContextValue>(
    () => ({
      workflow,
      parkingData,
      notificationReadiness,
      isRefreshingBackend,
      isSubmittingReservation,
      isStartingSession,
      isEndingSession,
      isCheckingNotifications,
      activeLocation,
      currentReservation,
      currentSession,
      activeSlot,
      slotCountLabel,
      isLiveData,
      selectedArrivalWindowLabel,
      createdReservationSlotLabel,
      connectionBannerMessage,
      setStage,
      setSelectedSlotId,
      setSelectedArrivalWindowMinutes,
      setPlateNumber,
      setValidationQrToken,
      refreshBackend: refreshFromBackend,
      retryBackendSync,
      enableNotifications,
      createReservation: handleCreateReservation,
      startSession: handleStartSession,
      endSession: handleEndSession,
      returnHome: async () => {
        await clearStoredWorkflowSnapshot();
        await cancelReminderNotifications();
        dispatchWorkflow({
          type: 'patch',
          patch: {
            stage: 'home',
            createdReservation: null,
            activeParkingSession: null,
            validationQrToken: '',
            reservationError: null,
            operation: 'idle',
            scheduledNotificationIds: [],
          },
        });
      },
      openReservationFlow,
      openValidationFlow,
      openSessionFlow,
    }),
    [
      activeLocation,
      activeSlot,
      cancelReminderNotifications,
      connectionBannerMessage,
      currentReservation,
      currentSession,
      createdReservationSlotLabel,
      enableNotifications,
      handleCreateReservation,
      handleEndSession,
      handleStartSession,
      isCheckingNotifications,
      isEndingSession,
      isLiveData,
      isRefreshingBackend,
      isStartingSession,
      isSubmittingReservation,
      notificationReadiness,
      openReservationFlow,
      openSessionFlow,
      openValidationFlow,
      parkingData,
      refreshFromBackend,
      retryBackendSync,
      setPlateNumber,
      setSelectedArrivalWindowMinutes,
      setSelectedSlotId,
      setStage,
      setValidationQrToken,
      selectedArrivalWindowLabel,
      slotCountLabel,
      workflow,
    ],
  );

  return <MobileWorkflowContext.Provider value={value}>{children}</MobileWorkflowContext.Provider>;
}

export function useMobileWorkflow() {
  const value = useContext(MobileWorkflowContext);

  if (!value) {
    throw new Error('useMobileWorkflow must be used within MobileWorkflowProvider');
  }

  return value;
}
