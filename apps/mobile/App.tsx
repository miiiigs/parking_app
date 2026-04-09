import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HomeScreen } from './src/screens/HomeScreen';
import { ReservationScreen } from './src/screens/ReservationScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { ValidationScreen } from './src/screens/ValidationScreen';
import {
  getFallbackParkingData,
  loadParkingDashboardData,
  type ParkingDashboardData,
} from './src/lib/parkingData';
import {
  createParkingReservation,
  endParkingSession,
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

type Stage = 'home' | 'reserve' | 'validate' | 'session';

export default function App() {
  const [stage, setStage] = useState<Stage>('home');
  const [parkingData, setParkingData] = useState<ParkingDashboardData>(getFallbackParkingData());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedArrivalWindowMinutes, setSelectedArrivalWindowMinutes] = useState<number>(DEFAULT_ARRIVAL_WINDOW_MINUTES);
  const [plateNumber, setPlateNumber] = useState('ABC-1234');
  const [validationQrToken, setValidationQrToken] = useState('');
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [createdReservation, setCreatedReservation] = useState<ReservationResult | null>(null);
  const [activeParkingSession, setActiveParkingSession] = useState<ParkingSessionResult | null>(null);
  const syncInProgressRef = useRef(false);

  async function refreshFromBackend() {
    if (syncInProgressRef.current) {
      return;
    }

    syncInProgressRef.current = true;

    try {
      await ensureMobileAuthSession();

      const refreshedParkingData = await loadParkingDashboardData();
      setParkingData(refreshedParkingData);

      setSelectedSlotId((currentSelectedSlotId) => {
        if (currentSelectedSlotId && refreshedParkingData.slots.some((slot) => slot.id === currentSelectedSlotId)) {
          return currentSelectedSlotId;
        }

        const nextAvailableSlot = refreshedParkingData.slots.find((slot) => slot.status === 'available') ?? refreshedParkingData.slots[0] ?? null;

        return nextAvailableSlot?.id ?? null;
      });

      if (createdReservation) {
        const latestReservation = await getParkingReservationById(createdReservation.reservation_id);

        if (!latestReservation) {
          setCreatedReservation(null);
          setActiveParkingSession(null);
          setValidationQrToken('');
          setReservationError('Reservation was removed from the database.');
          setStage('home');
          return;
        }

        setCreatedReservation(latestReservation);

        const latestSession = await getParkingSessionByReservationId(createdReservation.reservation_id);

        if (latestSession) {
          setActiveParkingSession(latestSession);
          if (stage === 'validate') {
            setStage('session');
          }
        } else {
          setActiveParkingSession(null);
          if (stage === 'session') {
            setStage('validate');
          }
        }
      }
    } catch {
      setParkingData(getFallbackParkingData());
    } finally {
      syncInProgressRef.current = false;
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const currentSelectionExists = selectedSlotId && parkingData.slots.some((slot) => slot.id === selectedSlotId);

    if (!currentSelectionExists) {
      const nextSlot = parkingData.slots.find((slot) => slot.status === 'available') ?? parkingData.slots[0] ?? null;
      setSelectedSlotId(nextSlot?.id ?? null);
    }
  }, [parkingData.slots, selectedSlotId]);

  useEffect(() => {
    void refreshFromBackend();

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
  }, [createdReservation, stage]);

  const activeLocation = parkingData.location;
  const currentSessionSlotId = activeParkingSession?.slot_id ?? createdReservation?.slot_id ?? null;
  const activeSlot = currentSessionSlotId
    ? parkingData.slots.find((slot) => slot.id === currentSessionSlotId) ?? parkingData.slots[0]
    : parkingData.slots[0];
  const slotCountLabel = isLoading ? 'Syncing live slot board...' : `${parkingData.slots.length} controlled slots`;
  const isLiveData = parkingData.isLiveData;
  const selectedArrivalWindow = ARRIVAL_WINDOW_OPTIONS.find((option) => option.minutes === selectedArrivalWindowMinutes) ?? ARRIVAL_WINDOW_OPTIONS[1];
  const createdReservationSlotLabel = createdReservation
    ? parkingData.slots.find((slot) => slot.id === createdReservation.slot_id)?.label ?? 'Assigned slot'
    : 'Assigned slot';

  async function handleCreateReservation() {
    if (!isLiveData) {
      setReservationError('Live backend data is unavailable. Connect Supabase before creating reservations.');
      return;
    }

    if (!selectedSlotId) {
      setReservationError('Select a slot before confirming the reservation.');
      return;
    }

    if (!plateNumber.trim()) {
      setReservationError('Enter a plate number before confirming the reservation.');
      return;
    }

    setIsSubmittingReservation(true);
    setReservationError(null);

    try {
      const reservationRecords = await createParkingReservation({
        slotId: selectedSlotId,
        arrivalWindowMinutes: selectedArrivalWindow.minutes,
        plateNumber: plateNumber.trim().toUpperCase(),
      });

      const reservation = reservationRecords[0] ?? null;

      if (!reservation) {
        throw new Error('Reservation was created but no record was returned.');
      }

      setCreatedReservation(reservation);
      setActiveParkingSession(null);

      const reservedSlot = parkingData.slots.find((slot) => slot.id === reservation.slot_id);
      setValidationQrToken(reservedSlot?.qrToken ?? '');

      const refreshed = await loadParkingDashboardData();
      setParkingData(refreshed);
      setStage('validate');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create reservation.';
      setReservationError(message);
    } finally {
      setIsSubmittingReservation(false);
    }
  }

  async function handleStartSession(slotQrTokenOverride?: string) {
    if (!createdReservation) {
      setReservationError('Create a reservation before starting a parking session.');
      setStage('reserve');
      return;
    }

    setIsStartingSession(true);
    setReservationError(null);

    const tokenToUse = (slotQrTokenOverride ?? validationQrToken).trim();

    try {
      const sessionRecords = await startParkingSession({
        reservationId: createdReservation.reservation_id,
        slotQrToken: tokenToUse || null,
      });

      const session = Array.isArray(sessionRecords) ? sessionRecords[0] ?? null : sessionRecords;

      if (!session) {
        throw new Error('Session validation succeeded but no session record was returned.');
      }

      setActiveParkingSession(session);

      const refreshed = await loadParkingDashboardData();
      setParkingData(refreshed);
      setStage('session');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start parking session.';
      setReservationError(message);
    } finally {
      setIsStartingSession(false);
    }
  }

  async function handleEndSession() {
    if (!createdReservation) {
      setStage('home');
      return;
    }

    if (activeParkingSession?.session_status === 'completed') {
      setStage('home');
      setCreatedReservation(null);
      setActiveParkingSession(null);
      setValidationQrToken('');
      return;
    }

    setIsEndingSession(true);
    setReservationError(null);

    try {
      const sessionRecords = await endParkingSession({
        reservationId: createdReservation.reservation_id,
        billedAmount: activeParkingSession?.reservation_fee ?? null,
      });

      const session = Array.isArray(sessionRecords) ? sessionRecords[0] ?? null : sessionRecords;

      if (!session) {
        throw new Error('Session completion succeeded but no session record was returned.');
      }

      setActiveParkingSession(session);

      const refreshed = await loadParkingDashboardData();
      setParkingData(refreshed);

      setStage('home');
      setCreatedReservation(null);
      setActiveParkingSession(null);
      setValidationQrToken('');
      setReservationError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete parking session.';
      setReservationError(message);
    } finally {
      setIsEndingSession(false);
    }
  }

  const renderStage = () => {
    if (stage === 'reserve') {
      return (
        <ReservationScreen
          slots={parkingData.slots}
          selectedSlotId={selectedSlotId}
          selectedArrivalWindowMinutes={selectedArrivalWindowMinutes}
          plateNumber={plateNumber}
          isSubmitting={isSubmittingReservation}
          isLiveData={isLiveData}
          errorMessage={reservationError}
          onSelectSlot={setSelectedSlotId}
          onSelectArrivalWindow={setSelectedArrivalWindowMinutes}
          onPlateNumberChange={setPlateNumber}
          onSubmit={handleCreateReservation}
          onBack={() => setStage('home')}
        />
      );
    }

    if (stage === 'validate') {
      return (
        <ValidationScreen
          reservation={createdReservation}
          assignedSlotLabel={createdReservationSlotLabel}
          expectedQrToken={createdReservation ? parkingData.slots.find((slot) => slot.id === createdReservation.slot_id)?.qrToken ?? validationQrToken : validationQrToken}
          slotQrToken={validationQrToken}
          onSlotQrTokenChange={setValidationQrToken}
          onValidate={handleStartSession}
          onBack={() => setStage('reserve')}
          isSubmitting={isStartingSession}
          errorMessage={reservationError}
        />
      );
    }

    if (stage === 'session') {
      return (
        <SessionScreen
          parkingSession={activeParkingSession}
          reservation={createdReservation}
          isSubmitting={isEndingSession}
          errorMessage={reservationError}
          onFinish={handleEndSession}
          onBack={() => setStage('validate')}
        />
      );
    }

    return (
      <HomeScreen
        locationName={activeLocation?.name ?? 'BGC Pilot Site'}
        locationAddress={activeLocation?.address ?? 'Bonifacio Global City, Taguig'}
        slotCountLabel={slotCountLabel}
        isLoading={isLoading}
        onStartReservation={() => setStage('reserve')}
        onViewSession={() => setStage('session')}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
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
