import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ParkingSessionResult, ReservationResult } from '../lib/reservations';

type Props = {
  reservation: ReservationResult | null;
  parkingSession: ParkingSessionResult | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onFinish: () => void;
  onBack: () => void;
};

export function SessionScreen({ reservation, parkingSession, isSubmitting, errorMessage, onFinish, onBack }: Props) {
  const isCompleted = parkingSession?.session_status === 'completed';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Step 3 of 3</Text>
      <Text style={styles.title}>{isCompleted ? 'Parking session completed.' : 'Parking session active.'}</Text>
      <Text style={styles.subtitle}>
        {isCompleted
          ? 'The session has been closed, payment was recorded, and the slot is available again.'
          : 'The timer starts after validation and billing updates in real time.'}
      </Text>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Session update failed</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isCompleted ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Payment recorded</Text>
          <Text style={styles.successText}>The session is now complete and the slot has been released.</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Session</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Timer</Text>
          <Text style={styles.rowValue}>Running</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Reservation</Text>
          <Text style={styles.rowValue}>{reservation?.slot_label ?? 'Unknown slot'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Session Status</Text>
          <Text style={styles.rowValue}>{parkingSession?.session_status ?? 'Active'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Payment</Text>
          <Text style={styles.rowValue}>{parkingSession?.payment_status ?? (isCompleted ? 'paid' : 'unpaid')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Started</Text>
          <Text style={styles.rowValue}>
            {parkingSession?.started_at ? new Date(parkingSession.started_at).toLocaleTimeString() : 'Just now'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Ended</Text>
          <Text style={styles.rowValue}>{parkingSession?.ended_at ? new Date(parkingSession.ended_at).toLocaleTimeString() : 'Not yet'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Billed</Text>
          <Text style={styles.rowValue}>
            PHP {(parkingSession?.billed_amount ?? parkingSession?.reservation_fee ?? 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Plate</Text>
          <Text style={styles.rowValue}>{parkingSession?.plate_number ?? 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={onFinish} disabled={isSubmitting}>
          <Text style={styles.primaryButtonText}>{isCompleted ? 'Return Home' : isSubmitting ? 'Ending...' : 'Mark as Paid & End Session'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f1b2c',
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  sectionLabel: {
    color: '#7bd3ff',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12,
  },
  title: {
    color: '#f4f7fb',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#b8c7da',
    fontSize: 15,
    lineHeight: 22,
  },
  errorBox: {
    backgroundColor: '#2a1114',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#8f3c46',
    gap: 6,
  },
  errorTitle: {
    color: '#ff8a80',
    fontWeight: '800',
    fontSize: 14,
  },
  errorText: {
    color: '#f2c9cd',
    fontSize: 13,
    lineHeight: 18,
  },
  successBox: {
    backgroundColor: '#0e231a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2d7f63',
    gap: 6,
  },
  successTitle: {
    color: '#3dd6a5',
    fontWeight: '800',
    fontSize: 14,
  },
  successText: {
    color: '#c6f2e4',
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 12,
  },
  cardTitle: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: '#b8c7da',
    fontSize: 14,
  },
  rowValue: {
    color: '#3dd6a5',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#071018',
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1a2e49',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#26405f',
  },
  secondaryButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
  },
});
