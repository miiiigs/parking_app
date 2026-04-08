import React, { useEffect, useState } from 'react';
import {
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
  startParkingSession,
  type ParkingSessionResult,
  type ReservationResult,
} from './src/lib/reservations';
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
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [createdReservation, setCreatedReservation] = useState<ReservationResult | null>(null);
  const [activeParkingSession, setActiveParkingSession] = useState<ParkingSessionResult | null>(null);

  useEffect(() => {
    const currentSelectionExists = selectedSlotId && parkingData.slots.some((slot) => slot.id === selectedSlotId);

    if (!currentSelectionExists) {
      const nextSlot = parkingData.slots.find((slot) => slot.status === 'available') ?? parkingData.slots[0] ?? null;
      setSelectedSlotId(nextSlot?.id ?? null);
    }
  }, [parkingData.slots, selectedSlotId]);

  useEffect(() => {
    let isMounted = true;

    loadParkingDashboardData()
      .then((data) => {
        if (isMounted) {
          setParkingData(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setParkingData(getFallbackParkingData());
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeLocation = parkingData.location;
  const activeSlot = parkingData.slots.find((slot) => slot.status === 'reserved') ?? parkingData.slots[0];
  const slotCountLabel = isLoading ? 'Syncing live slot board...' : `${parkingData.slots.length} controlled slots`;
  const selectedArrivalWindow = ARRIVAL_WINDOW_OPTIONS.find((option) => option.minutes === selectedArrivalWindowMinutes) ?? ARRIVAL_WINDOW_OPTIONS[1];
  const createdReservationSlotLabel = createdReservation
    ? parkingData.slots.find((slot) => slot.id === createdReservation.slot_id)?.label ?? 'Assigned slot'
    : 'Assigned slot';

  async function handleCreateReservation() {
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

  async function handleStartSession() {
    if (!createdReservation) {
      setReservationError('Create a reservation before starting a parking session.');
      setStage('reserve');
      return;
    }

    setIsStartingSession(true);
    setReservationError(null);

    try {
      const sessionRecords = await startParkingSession({
        reservationId: createdReservation.reservation_id,
        slotQrToken: validationQrToken.trim() || null,
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

  const renderStage = () => {
    if (stage === 'reserve') {
      return (
        <ReservationScreen
          slots={parkingData.slots}
          selectedSlotId={selectedSlotId}
          selectedArrivalWindowMinutes={selectedArrivalWindowMinutes}
          plateNumber={plateNumber}
          isSubmitting={isSubmittingReservation}
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
          onFinish={() => {
            setStage('home');
            setCreatedReservation(null);
            setActiveParkingSession(null);
          }}
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
