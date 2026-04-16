import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  type AppStateStatus,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ReservationScreen } from './src/screens/ReservationScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { ValidationScreen } from './src/screens/ValidationScreen';
// @ts-expect-error JS helper used for Node test coverage and shared runtime logic.
import { workflowReducer as applyWorkflowAction } from './src/lib/workflowReducer';
// @ts-expect-error JS helper used for Node test coverage and shared runtime logic.
import { buildStoredWorkflowSnapshot, getNextSelectedSlotId } from './src/lib/workflowLogic';
import {
  getFallbackParkingData,
  loadParkingDashboardData,
  type ParkingDashboardData,
} from './src/lib/parkingData';
import {
  createParkingReservation,
  endParkingSession,
  getCurrentMobileWorkflowState,
  getParkingReservationById,
  getParkingSessionByReservationId,
  loadMobileProfileData,
  startParkingSession,
  type MobileProfileData,
  type ParkingSessionResult,
  type ReservationResult,
} from './src/lib/reservations';
import { ensureMobileAuthSession, getSupabaseClient } from './src/lib/supabaseClient';
import {
  DEFAULT_ARRIVAL_WINDOW_MINUTES,
  ARRIVAL_WINDOW_OPTIONS,
} from './src/lib/reservationOptions';
import {
  clearStoredWorkflowSnapshot,
  loadStoredWorkflowSnapshot,
  saveStoredWorkflowSnapshot,
} from './src/lib/workflowStorage';
// @ts-expect-error JS helper used for Node test coverage and shared runtime logic.
import { buildOfflineRecoveryPatch, shouldScheduleReservationFollowUpNotifications } from './src/lib/workflowRecovery';
import {
  cancelReservationNotifications,
  cancelScheduledNotifications,
  ensureParkingNotificationsEnabled,
  getParkingNotificationReadiness,
  hasScheduledReservationNotifications,
  scheduleReservationConfirmationNotification,
  scheduleReservationFollowUpNotifications,
  sendSessionCompletedNotification,
} from './src/lib/notifications';

type Stage = 'home' | 'reserve' | 'validate' | 'session';
type AppTab = 'home' | 'book' | 'profile';
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

type ProfileState = MobileProfileData;

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

function buildLocalProfileData({
  plateNumber,
  locationName,
  currentReservation,
  currentSession,
  notificationLabel,
  notificationMessage,
}: {
  plateNumber: string;
  locationName: string;
  currentReservation: ReservationResult | null;
  currentSession: ParkingSessionResult | null;
  notificationLabel: string;
  notificationMessage: string;
}): MobileProfileData {
  const hasActiveSession = Boolean(currentSession && currentSession.session_status !== 'completed');
  const currentActivity = currentSession
    ? {
        id: `local-session-${currentSession.session_id}`,
        title: currentSession.session_status === 'completed' ? 'Session completed' : 'Session active',
        detail:
          currentSession.session_status === 'completed'
            ? `${currentSession.slot_label} · Paid PHP ${Number(currentSession.billed_amount ?? currentSession.reservation_fee ?? 0).toFixed(2)}`
            : `${currentSession.slot_label} · Parking in progress`,
        timestamp: currentSession.ended_at ?? currentSession.started_at,
        tone: currentSession.session_status === 'completed' ? 'success' : 'info',
      }
    : currentReservation
      ? {
          id: `local-reservation-${currentReservation.reservation_id}`,
          title: 'Reservation confirmed',
          detail: `${currentReservation.slot_label} · Expires ${new Date(currentReservation.expires_at).toLocaleTimeString()}`,
          timestamp: currentReservation.reserved_at,
          tone: 'info',
        }
      : null;

  return {
    displayName: 'Guest Driver',
    email: null,
    memberSinceLabel: 'This device',
    plateNumber,
    stats: {
      reservationsCount: currentReservation ? 1 : 0,
      activeSessions: hasActiveSession ? 1 : 0,
      completedSessions: currentSession?.session_status === 'completed' ? 1 : 0,
      totalBilledAmount: Number(currentSession?.billed_amount ?? currentSession?.reservation_fee ?? 0),
    },
    recentActivity: currentActivity
      ? [currentActivity, {
          id: 'local-notifications',
          title: notificationLabel,
          detail: notificationMessage,
          timestamp: new Date().toISOString(),
          tone: 'neutral',
        }]
      : [{
          id: 'local-notifications',
          title: notificationLabel,
          detail: notificationMessage,
          timestamp: new Date().toISOString(),
          tone: 'neutral',
        }],
    lastUpdatedLabel: `${locationName} · Updated just now`,
  };
}

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  return applyWorkflowAction(state, action);
}

export default function App() {
  const [workflow, dispatchWorkflow] = useReducer(workflowReducer, initialWorkflowState);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [parkingData, setParkingData] = useState<ParkingDashboardData>(getFallbackParkingData());
  const [notificationReadiness, setNotificationReadiness] = useState<NotificationReadinessState>(initialNotificationReadinessState);
  const [profileData, setProfileData] = useState<MobileProfileData | null>(null);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isCheckingNotifications, setIsCheckingNotifications] = useState(false);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const syncInProgressRef = useRef(false);
  const hasBootstrappedRef = useRef(false);
  const workflowRef = useRef(workflow);
  const [isRefreshingBackend, setIsRefreshingBackend] = useState(false);
  const profileRefreshInProgressRef = useRef(false);

  useEffect(() => {
    workflowRef.current = workflow;
  }, [workflow]);

  async function refreshNotificationReadiness() {
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
  }

  async function enableNotifications() {
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
  }

  async function refreshProfileData() {
    if (profileRefreshInProgressRef.current) {
      return;
    }

    profileRefreshInProgressRef.current = true;
    setIsRefreshingProfile(true);

    try {
      const loadedProfile = await loadMobileProfileData();
      setProfileData(loadedProfile);
    } finally {
      profileRefreshInProgressRef.current = false;
      setIsRefreshingProfile(false);
    }
  }

  async function cancelReminderNotifications() {
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
  }

  async function persistCurrentWorkflowSnapshot(nextScheduledNotificationIds?: string[]) {
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
  }

  async function scheduleFollowUpNotificationsOnBackground() {
    const currentWorkflow = workflowRef.current;
    const reservationId = currentWorkflow.createdReservation?.reservation_id;

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
        parkingData.slots.find((slot) => slot.id === currentWorkflow.createdReservation?.slot_id)?.label ?? 'Assigned slot',
      expiresAt: currentWorkflow.createdReservation.expires_at,
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
  }

  async function refreshFromBackend() {
    if (syncInProgressRef.current) {
      return;
    }

    syncInProgressRef.current = true;
    setIsRefreshingBackend(true);

    try {
      await ensureMobileAuthSession();

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

          if (storedWorkflow && storedWorkflow.stage !== 'home') {
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
    } catch {
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
  }

  async function retryBackendSync() {
    await refreshFromBackend();
    await refreshNotificationReadiness();
  }

  useEffect(() => {
    const splashTimerId = setTimeout(() => {
      setIsSplashVisible(false);
    }, 1100);

    return () => {
      clearTimeout(splashTimerId);
    };
  }, []);

  useEffect(() => {
    const currentSelectionExists = workflow.selectedSlotId && parkingData.slots.some((slot) => slot.id === workflow.selectedSlotId);

    if (!currentSelectionExists) {
      const nextSlot = parkingData.slots.find((slot) => slot.status === 'available') ?? parkingData.slots[0] ?? null;
      dispatchWorkflow({
        type: 'patch',
        patch: {
          selectedSlotId: nextSlot?.id ?? null,
        },
      });
    }
  }, [parkingData.slots, workflow.selectedSlotId]);

  useEffect(() => {
    void refreshFromBackend();
    void refreshNotificationReadiness();
    void refreshProfileData();

    const supabaseClient = getSupabaseClient();
    const liveRefresh = () => {
      void refreshFromBackend();
    };

    let channel: ReturnType<NonNullable<typeof supabaseClient>['channel']> | null = null;

    if (supabaseClient) {
      channel = supabaseClient
        .channel('mobile-dashboard-live-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, liveRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, liveRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_sessions' }, liveRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, liveRefresh)
        .subscribe();
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void refreshFromBackend();
        void refreshNotificationReadiness();
      } else if (nextAppState === 'background') {
        void scheduleFollowUpNotificationsOnBackground();
      }
    });

    const intervalId = setInterval(() => {
      void refreshFromBackend();
    }, 15000);

    return () => {
      if (supabaseClient && channel) {
        void supabaseClient.removeChannel(channel);
      }

      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'profile') {
      void refreshProfileData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!hasBootstrappedRef.current) {
      return;
    }

    const currentReservationId = workflow.createdReservation?.reservation_id ?? workflow.activeParkingSession?.reservation_id ?? null;

    if (workflow.stage === 'home' && !currentReservationId) {
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
  const createdReservationSlotLabel = currentReservation
    ? parkingData.slots.find((slot) => slot.id === currentReservation.slot_id)?.label ?? 'Assigned slot'
    : 'Assigned slot';

  async function handleCreateReservation() {
    if (!isLiveData) {
      dispatchWorkflow({
        type: 'patch',
        patch: {
          reservationError: 'Live backend data is unavailable. Connect Supabase before creating reservations.',
        },
      });
      return;
    }

    if (!workflow.selectedSlotId) {
      dispatchWorkflow({
        type: 'patch',
        patch: {
          reservationError: 'Select a slot before confirming the reservation.',
        },
      });
      return;
    }

    if (!workflow.plateNumber.trim()) {
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
        slotId: workflow.selectedSlotId,
        arrivalWindowMinutes: selectedArrivalWindow.minutes,
        plateNumber: workflow.plateNumber.trim().toUpperCase(),
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

      const refreshed = await loadParkingDashboardData();
      setParkingData(refreshed);
      dispatchWorkflow({
        type: 'patch',
        patch: {
          connectionState: refreshed.isLiveData ? 'live' : 'degraded',
          connectionMessage: refreshed.isLiveData
            ? null
            : 'Using fallback parking data until Supabase becomes available again.',
        },
      });
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
  }

  async function handleStartSession(slotQrTokenOverride?: string) {
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

    const tokenToUse = (slotQrTokenOverride ?? workflow.validationQrToken).trim();

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

      const refreshed = await loadParkingDashboardData();
      setParkingData(refreshed);
      dispatchWorkflow({
        type: 'patch',
        patch: {
          connectionState: refreshed.isLiveData ? 'live' : 'degraded',
          connectionMessage: refreshed.isLiveData
            ? null
            : 'Using fallback parking data until Supabase becomes available again.',
        },
      });
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
  }

  async function handleEndSession() {
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
      const sessionRecords = await endParkingSession({
        reservationId: currentReservation.reservation_id,
        billedAmount: currentSession?.reservation_fee ?? null,
      });

      const session = Array.isArray(sessionRecords) ? sessionRecords[0] ?? null : sessionRecords;

      if (!session) {
        throw new Error('Session completion succeeded but no session record was returned.');
      }

      await cancelReminderNotifications();
      await sendSessionCompletedNotification({
        slotLabel: currentReservation?.slot_label ?? activeSlot?.label ?? 'Assigned slot',
        billedAmount: Number(session.billed_amount ?? session.reservation_fee ?? 0),
      });

      dispatchWorkflow({
        type: 'patch',
        patch: {
          activeParkingSession: session,
          reservationError: null,
        },
      });

      const refreshed = await loadParkingDashboardData();
      setParkingData(refreshed);

      await clearStoredWorkflowSnapshot();
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
          connectionState: refreshed.isLiveData ? 'live' : 'degraded',
          connectionMessage: refreshed.isLiveData
            ? null
            : 'Using fallback parking data until Supabase becomes available again.',
        },
      });
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
  }

  const connectionBannerMessage =
    workflow.connectionState === 'booting'
      ? workflow.connectionMessage ?? 'Syncing live parking data...'
      : workflow.connectionState === 'offline'
        ? workflow.connectionMessage ?? 'Live backend is unavailable. Using fallback data.'
        : workflow.connectionState === 'degraded'
          ? workflow.connectionMessage ?? 'Operating with fallback parking data.'
          : null;

  const bookingStage: Stage = workflow.stage === 'home' ? 'reserve' : workflow.stage;
  const headerTitle =
    activeTab === 'profile'
      ? 'Profile'
      : activeTab === 'book'
        ? bookingStage === 'reserve'
          ? 'Book a Slot'
          : bookingStage === 'validate'
            ? 'Validate Booking'
            : 'Active Session'
        : 'Home';
  const headerStatusLabel =
    workflow.connectionState === 'live'
      ? activeTab === 'profile'
        ? 'Profile synced'
        : 'Live data'
      : workflow.connectionState === 'offline'
        ? 'Offline mode'
        : workflow.connectionState === 'degraded'
          ? 'Fallback data'
          : 'Syncing now';

  const profileViewModel =
    profileData ??
    buildLocalProfileData({
      plateNumber: workflow.plateNumber,
      locationName: activeLocation?.name ?? 'BGC Pilot Site',
      currentReservation,
      currentSession,
      notificationLabel: notificationReadiness.label,
      notificationMessage: notificationReadiness.message,
    });

  function openHomeTab() {
    setActiveTab('home');
  }

  function openBookingTab(stageOverride?: Stage) {
    setActiveTab('book');

    if (stageOverride) {
      dispatchWorkflow({
        type: 'patch',
        patch: {
          stage: stageOverride,
          reservationError: null,
        },
      });
      return;
    }

    if (workflow.stage === 'home') {
      dispatchWorkflow({
        type: 'patch',
        patch: {
          stage: 'reserve',
          reservationError: null,
        },
      });
    }
  }

  function openProfileTab() {
    setActiveTab('profile');
  }

  const renderBookingStage = () => {
    if (bookingStage === 'reserve') {
      return (
        <ReservationScreen
          slots={parkingData.slots}
          selectedSlotId={workflow.selectedSlotId}
          selectedArrivalWindowMinutes={workflow.selectedArrivalWindowMinutes}
          plateNumber={workflow.plateNumber}
          isSubmitting={workflow.operation === 'creatingReservation' || isSubmittingReservation}
          isLiveData={isLiveData}
          errorMessage={workflow.reservationError}
          onSelectSlot={(slotId) =>
            dispatchWorkflow({
              type: 'patch',
              patch: { selectedSlotId: slotId },
            })
          }
          onSelectArrivalWindow={(minutes) =>
            dispatchWorkflow({
              type: 'patch',
              patch: { selectedArrivalWindowMinutes: minutes },
            })
          }
          onPlateNumberChange={(plateNumber) =>
            dispatchWorkflow({
              type: 'patch',
              patch: { plateNumber },
            })
          }
          onSubmit={handleCreateReservation}
          onBack={() => {
            setActiveTab('home');
            dispatchWorkflow({
              type: 'patch',
              patch: {
                stage: 'home',
              },
            });
          }}
        />
      );
    }

    if (bookingStage === 'validate') {
      return (
        <ValidationScreen
          reservation={currentReservation}
          assignedSlotLabel={createdReservationSlotLabel}
          expectedQrToken={currentReservation ? parkingData.slots.find((slot) => slot.id === currentReservation.slot_id)?.qrToken ?? workflow.validationQrToken : workflow.validationQrToken}
          slotQrToken={workflow.validationQrToken}
          onSlotQrTokenChange={(value) =>
            dispatchWorkflow({
              type: 'patch',
              patch: { validationQrToken: value },
            })
          }
          onValidate={handleStartSession}
          onBack={() =>
            dispatchWorkflow({
              type: 'patch',
              patch: { stage: 'reserve' },
            })
          }
          isSubmitting={workflow.operation === 'startingSession' || isStartingSession}
          errorMessage={workflow.reservationError}
        />
      );
    }

    return (
      <SessionScreen
        parkingSession={currentSession}
        reservation={currentReservation}
        isSubmitting={workflow.operation === 'endingSession' || isEndingSession}
        errorMessage={workflow.reservationError}
        onFinish={handleEndSession}
        onBack={() =>
          dispatchWorkflow({
            type: 'patch',
            patch: { stage: 'validate' },
          })
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Modal visible={isSplashVisible} animationType="fade" transparent={false}>
        <View style={styles.splashScreen}>
          <View style={styles.splashOrb} />
          <View style={styles.splashBadge}>
            <Text style={styles.splashBadgeText}>SP</Text>
          </View>
          <Text style={styles.splashTitle}>Smart Parking</Text>
          <Text style={styles.splashSubtitle}>Book a slot, validate on site, and manage the session cleanly.</Text>
          <View style={styles.splashPills}>
            <View style={styles.splashPill}>
              <Text style={styles.splashPillText}>Reserve</Text>
            </View>
            <View style={styles.splashPill}>
              <Text style={styles.splashPillText}>Validate</Text>
            </View>
            <View style={styles.splashPill}>
              <Text style={styles.splashPillText}>Profile</Text>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isMenuVisible} animationType="fade" transparent onRequestClose={() => setIsMenuVisible(false)}>
        <View style={styles.menuBackdrop}>
          <TouchableOpacity style={styles.menuBackdropHitbox} activeOpacity={1} onPress={() => setIsMenuVisible(false)} />
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuKicker}>Quick menu</Text>
                <Text style={styles.menuTitle}>Smart Parking</Text>
              </View>
              <TouchableOpacity style={styles.menuCloseButton} onPress={() => setIsMenuVisible(false)}>
                <Text style={styles.menuCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.menuText}>Jump straight to the main areas of the app or refresh the live state.</Text>
            <View style={styles.menuActionList}>
              <TouchableOpacity
                style={styles.menuAction}
                onPress={() => {
                  setIsMenuVisible(false);
                  openHomeTab();
                }}
              >
                <Text style={styles.menuActionTitle}>Home</Text>
                <Text style={styles.menuActionText}>Overview and notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuAction}
                onPress={() => {
                  setIsMenuVisible(false);
                  openBookingTab();
                }}
              >
                <Text style={styles.menuActionTitle}>Book a slot</Text>
                <Text style={styles.menuActionText}>Reserve, validate, and continue the flow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuAction}
                onPress={() => {
                  setIsMenuVisible(false);
                  openProfileTab();
                }}
              >
                <Text style={styles.menuActionTitle}>Profile</Text>
                <Text style={styles.menuActionText}>History, activity, and account summary</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuAction}
                onPress={() => {
                  setIsMenuVisible(false);
                  void retryBackendSync();
                }}
              >
                <Text style={styles.menuActionTitle}>Refresh live data</Text>
                <Text style={styles.menuActionText}>{isRefreshingBackend ? 'Refreshing now...' : 'Reconnect to Supabase'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuAction}
                onPress={() => {
                  setIsMenuVisible(false);
                  void refreshProfileData();
                }}
              >
                <Text style={styles.menuActionTitle}>Refresh profile</Text>
                <Text style={styles.menuActionText}>{isRefreshingProfile ? 'Updating activity...' : 'Reload recent history'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuAction}
                onPress={() => {
                  setIsMenuVisible(false);
                  void enableNotifications();
                }}
              >
                <Text style={styles.menuActionTitle}>Notifications</Text>
                <Text style={styles.menuActionText}>{notificationReadiness.label}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.headerBrandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>SP</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerKicker}>Smart Parking</Text>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              <Text style={styles.headerSubtitle}>{activeLocation?.city ?? 'Bonifacio Global City'}</Text>
                <View
                  style={[
                    styles.headerStatusChip,
                    workflow.connectionState === 'offline'
                      ? styles.headerStatusChipOffline
                      : workflow.connectionState === 'degraded'
                        ? styles.headerStatusChipDegraded
                        : workflow.connectionState === 'booting'
                          ? styles.headerStatusChipBooting
                          : styles.headerStatusChipLive,
                  ]}
                >
                  <Text
                    style={[
                      styles.headerStatusChipText,
                      workflow.connectionState === 'offline'
                        ? styles.headerStatusChipTextOffline
                        : workflow.connectionState === 'degraded'
                          ? styles.headerStatusChipTextDegraded
                          : workflow.connectionState === 'booting'
                            ? styles.headerStatusChipTextBooting
                            : styles.headerStatusChipTextLive,
                    ]}
                  >
                    {headerStatusLabel}
                  </Text>
                </View>
            </View>
          </View>
          <TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuVisible(true)}>
            <Text style={styles.menuButtonText}>Menu</Text>
          </TouchableOpacity>
        </View>

        {connectionBannerMessage ? (
          <View
            style={[
              styles.banner,
              workflow.connectionState === 'offline' ? styles.bannerOffline : styles.bannerDegraded,
            ]}
          >
            <View style={styles.bannerTextRow}>
              <View style={styles.bannerCopy}>
                <Text style={styles.bannerTitle}>
                  {workflow.connectionState === 'offline'
                    ? 'Offline mode'
                    : workflow.connectionState === 'degraded'
                      ? 'Fallback data in use'
                      : 'Booting'}
                </Text>
                <Text style={styles.bannerText}>{connectionBannerMessage}</Text>
              </View>
              {workflow.connectionState !== 'live' ? (
                <TouchableOpacity
                  style={[styles.bannerButton, isRefreshingBackend ? styles.bannerButtonDisabled : null]}
                  onPress={() => {
                    void retryBackendSync();
                  }}
                  disabled={isRefreshingBackend}
                >
                  <Text style={styles.bannerButtonText}>{isRefreshingBackend ? 'Retrying...' : 'Retry'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'profile' ? (
            <ProfileScreen
              profileData={profileViewModel}
              locationName={activeLocation?.name ?? 'BGC Pilot Site'}
              isRefreshing={isRefreshingProfile}
              onRefresh={() => {
                void refreshProfileData();
              }}
              onOpenBooking={() => {
                openBookingTab(currentSession ? 'session' : currentReservation ? 'validate' : 'reserve');
              }}
              onOpenHome={openHomeTab}
            />
          ) : activeTab === 'book' ? (
            renderBookingStage()
          ) : (
            <HomeScreen
              locationName={activeLocation?.name ?? 'BGC Pilot Site'}
              locationAddress={activeLocation?.address ?? 'Bonifacio Global City, Taguig'}
              slotCountLabel={slotCountLabel}
              isLoading={workflow.connectionState === 'booting'}
              notificationLabel={notificationReadiness.label}
              notificationMessage={notificationReadiness.message}
              isRefreshingNotifications={isCheckingNotifications}
              onStartReservation={() => openBookingTab('reserve')}
              onViewSession={() =>
                openBookingTab(currentSession ? 'session' : currentReservation ? 'validate' : 'reserve')
              }
              onEnableNotifications={() => {
                void enableNotifications();
              }}
            />
          )}

          {activeTab !== 'profile' ? (
            <View style={styles.statusCard}>
              <View style={styles.statusHeaderRow}>
                <Text style={styles.statusTitle}>Current Session</Text>
                <Text style={styles.statusChip}>{currentSession?.session_status ? 'Tracked' : currentReservation ? 'Tracked' : 'Ready'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Location</Text>
                <Text style={styles.statusValue}>{activeLocation?.name ?? 'BGC Pilot Site'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Assigned Slot</Text>
                <Text style={styles.statusValue}>{activeSlot?.label ?? 'Slot #12'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Stage</Text>
                <Text style={styles.statusValue}>{bookingStage.toUpperCase()}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Timer</Text>
                <Text style={styles.statusValue}>{currentSession?.started_at ? new Date(currentSession.started_at).toLocaleTimeString() : 'Waiting to start'}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={[styles.navItem, activeTab === 'home' ? styles.navItemActive : null]} onPress={openHomeTab}>
            <View style={styles.navItemContent}>
              <Text style={[styles.navItemLabel, activeTab === 'home' ? styles.navItemLabelActive : null]}>Home</Text>
              <Text style={[styles.navItemHint, activeTab === 'home' ? styles.navItemHintActive : null]}>Overview</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navItem, activeTab === 'book' ? styles.navItemActive : null]} onPress={() => openBookingTab()}>
            <View style={styles.navItemContent}>
              <Text style={[styles.navItemLabel, activeTab === 'book' ? styles.navItemLabelActive : null]}>Book</Text>
              <Text style={[styles.navItemHint, activeTab === 'book' ? styles.navItemHintActive : null]}>Reserve</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navItem, activeTab === 'profile' ? styles.navItemActive : null]} onPress={openProfileTab}>
            <View style={styles.navItemContent}>
              <Text style={[styles.navItemLabel, activeTab === 'profile' ? styles.navItemLabelActive : null]}>Profile</Text>
              <Text style={[styles.navItemHint, activeTab === 'profile' ? styles.navItemHintActive : null]}>History</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07111b',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  shell: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#3dd6a5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#071018',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerCopy: {
    flex: 1,
    gap: 1,
  },
  headerKicker: {
    color: '#7bd3ff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#f4f7fb',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#b8c7da',
    fontSize: 12,
  },
  headerStatusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    marginTop: 6,
  },
  headerStatusChipLive: {
    backgroundColor: '#0d1a2a',
    borderColor: '#3dd6a5',
  },
  headerStatusChipOffline: {
    backgroundColor: '#2a1114',
    borderColor: '#8f3c46',
  },
  headerStatusChipDegraded: {
    backgroundColor: '#2a220f',
    borderColor: '#8a6b2f',
  },
  headerStatusChipBooting: {
    backgroundColor: '#0f1b2c',
    borderColor: '#26405f',
  },
  headerStatusChipText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerStatusChipTextLive: {
    color: '#3dd6a5',
  },
  headerStatusChipTextOffline: {
    color: '#ffb3be',
  },
  headerStatusChipTextDegraded: {
    color: '#ffcf66',
  },
  headerStatusChipTextBooting: {
    color: '#7bd3ff',
  },
  menuButton: {
    backgroundColor: '#0f1b2c',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#26405f',
  },
  menuButtonText: {
    color: '#f4f7fb',
    fontWeight: '800',
    fontSize: 13,
  },
  banner: {
    borderRadius: 18,
    padding: 16,
    gap: 6,
    borderWidth: 1,
  },
  bannerTextRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bannerCopy: {
    flex: 1,
    gap: 6,
  },
  bannerOffline: {
    backgroundColor: '#2a1114',
    borderColor: '#8f3c46',
  },
  bannerDegraded: {
    backgroundColor: '#2a220f',
    borderColor: '#8a6b2f',
  },
  bannerTitle: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  bannerText: {
    color: '#f5e6bf',
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#0f1b2c',
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    color: '#f4f7fb',
    fontSize: 18,
    fontWeight: '700',
  },
  bannerButton: {
    backgroundColor: '#1a2e49',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#26405f',
  },
  bannerButtonDisabled: {
    opacity: 0.7,
  },
  bannerButtonText: {
    color: '#f4f7fb',
    fontSize: 13,
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: '#0f1b2c',
    borderRadius: 20,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  statusTitle: {
    color: '#f4f7fb',
    fontSize: 16,
    fontWeight: '800',
  },
  statusChip: {
    color: '#3dd6a5',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusLabel: {
    color: '#7f94ad',
    fontSize: 13,
  },
  statusValue: {
    color: '#f4f7fb',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#18283f',
    backgroundColor: '#07111b',
  },
  navItem: {
    flex: 1,
    backgroundColor: '#0f1b2c',
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 2,
  },
  navItemContent: {
    alignItems: 'center',
    gap: 2,
  },
  navItemActive: {
    backgroundColor: '#12233a',
    borderColor: '#3dd6a5',
  },
  navItemLabel: {
    color: '#b8c7da',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  navItemLabelActive: {
    color: '#f4f7fb',
  },
  navItemHint: {
    color: '#7f94ad',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  navItemHintActive: {
    color: '#3dd6a5',
  },
  splashScreen: {
    flex: 1,
    backgroundColor: '#07111b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  splashOrb: {
    position: 'absolute',
    top: '22%',
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: '#12233a',
    opacity: 0.7,
  },
  splashBadge: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: '#3dd6a5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashBadgeText: {
    color: '#071018',
    fontSize: 28,
    fontWeight: '900',
  },
  splashTitle: {
    color: '#f4f7fb',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  splashSubtitle: {
    color: '#b8c7da',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
  splashPills: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 6,
  },
  splashPill: {
    backgroundColor: '#0f1b2c',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  splashPillText: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 9, 16, 0.72)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  menuBackdropHitbox: {
    ...StyleSheet.absoluteFillObject,
  },
  menuCard: {
    backgroundColor: '#0b1320',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1b2b43',
    gap: 12,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  menuKicker: {
    color: '#7bd3ff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuTitle: {
    color: '#f4f7fb',
    fontSize: 20,
    fontWeight: '900',
  },
  menuCloseButton: {
    backgroundColor: '#1a2e49',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#26405f',
  },
  menuCloseText: {
    color: '#f4f7fb',
    fontSize: 12,
    fontWeight: '800',
  },
  menuText: {
    color: '#b8c7da',
    fontSize: 13,
    lineHeight: 19,
  },
  menuActionList: {
    gap: 10,
  },
  menuAction: {
    backgroundColor: '#0f1b2c',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 4,
  },
  menuActionTitle: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '800',
  },
  menuActionText: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#7f94ad',
    fontSize: 14,
  },
  value: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '600',
  },
});
