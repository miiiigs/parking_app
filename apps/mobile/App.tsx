import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
  AppState,
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
  startParkingSession,
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

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  return applyWorkflowAction(state, action);
}

export default function App() {
  const [workflow, dispatchWorkflow] = useReducer(workflowReducer, initialWorkflowState);
  const [parkingData, setParkingData] = useState<ParkingDashboardData>(getFallbackParkingData());
  const [notificationReadiness, setNotificationReadiness] = useState<NotificationReadinessState>(initialNotificationReadinessState);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isCheckingNotifications, setIsCheckingNotifications] = useState(false);
  const syncInProgressRef = useRef(false);
  const hasBootstrappedRef = useRef(false);
  const workflowRef = useRef(workflow);
  const [isRefreshingBackend, setIsRefreshingBackend] = useState(false);

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

  async function scheduleFollowUpNotificationsOnBackground() {
    const currentWorkflow = workflowRef.current;

    if (currentWorkflow.stage !== 'validate' || !currentWorkflow.createdReservation || currentWorkflow.activeParkingSession) {
      return;
    }

    if (currentWorkflow.scheduledNotificationIds.length > 1) {
      return;
    }

    if (await hasScheduledReservationNotifications(currentWorkflow.createdReservation.reservation_id, ['reservation-expiry-reminder', 'reservation-expired'])) {
      return;
    }

    const reminderIds = await scheduleReservationFollowUpNotifications({
      reservationId: currentWorkflow.createdReservation.reservation_id,
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
                scheduledNotificationIds: storedWorkflow.scheduledNotificationIds,
                reservationError: null,
              },
            });
          }
        }
      }
    } catch {
      setParkingData(getFallbackParkingData());
      dispatchWorkflow({
        type: 'patch',
        patch: {
          connectionState: 'offline',
          connectionMessage: 'Live backend data is unavailable. Showing fallback data. Tap Retry to check again.',
        },
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
    workflow.createdReservation?.reservation_id,
    workflow.plateNumber,
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

  const renderStage = () => {
    if (workflow.stage === 'reserve') {
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
          onBack={() =>
            dispatchWorkflow({
              type: 'patch',
              patch: {
                stage: 'home',
              },
            })
          }
        />
      );
    }

    if (workflow.stage === 'validate') {
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

    if (workflow.stage === 'session') {
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
    }

    return (
      <HomeScreen
        locationName={activeLocation?.name ?? 'BGC Pilot Site'}
        locationAddress={activeLocation?.address ?? 'Bonifacio Global City, Taguig'}
        slotCountLabel={slotCountLabel}
        isLoading={workflow.connectionState === 'booting'}
        notificationLabel={notificationReadiness.label}
        notificationMessage={notificationReadiness.message}
        isRefreshingNotifications={isCheckingNotifications}
        onStartReservation={() =>
          dispatchWorkflow({
            type: 'patch',
            patch: {
              stage: 'reserve',
              reservationError: null,
            },
          })
        }
        onViewSession={() =>
          dispatchWorkflow({
            type: 'patch',
            patch: {
              stage: currentSession ? 'session' : currentReservation ? 'validate' : 'reserve',
              reservationError: currentSession || currentReservation ? null : 'No active parking session is available right now.',
            },
          })
        }
        onEnableNotifications={() => {
          void enableNotifications();
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
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

        {renderStage()}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current Session</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{activeLocation?.name ?? 'BGC Pilot Site'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Assigned Slot</Text>
            <Text style={styles.value}>{activeSlot?.label ?? 'Slot #12'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Timer</Text>
            <Text style={styles.value}>01:24:18</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  content: {
    padding: 20,
    gap: 16,
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
