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
  const billedAmount = parkingSession?.billed_amount ?? parkingSession?.reservation_fee ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <Text style={styles.sectionLabel}>Step 3 of 3</Text>
        </View>
        <Text style={styles.title}>{isCompleted ? 'Parking session completed.' : 'Parking session active.'}</Text>
        <Text style={styles.subtitle}>
          {isCompleted
            ? 'The session has been closed, payment was recorded, and the slot is available again.'
            : 'The timer starts after validation and billing updates in real time.'}
        </Text>
      </View>

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

      <View style={styles.spotlightCard}>
        <View style={styles.spotlightRow}>
          <View>
            <Text style={styles.spotlightLabel}>Live timer</Text>
            <Text style={styles.spotlightValue}>{isCompleted ? 'Closed' : 'Running'}</Text>
          </View>
          <Text style={styles.spotlightAmount}>PHP {billedAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.spotlightMetaRow}>
          <Text style={styles.spotlightMetaText}>{reservation?.slot_label ?? 'Unknown slot'}</Text>
          <Text style={styles.spotlightMetaDot}>•</Text>
          <Text style={styles.spotlightMetaText}>{parkingSession?.payment_status ?? (isCompleted ? 'paid' : 'unpaid')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Live Session</Text>
          <Text style={styles.cardBadge}>{parkingSession?.session_status ?? 'Active'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Timer</Text>
          <Text style={styles.rowValue}>{isCompleted ? 'Closed' : 'Running'}</Text>
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
            PHP {billedAmount.toFixed(2)}
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
    backgroundColor: '#0b1320',
    borderRadius: 28,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#152234',
  },
  heroCard: {
    backgroundColor: '#111c2d',
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1b2b43',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
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
  spotlightCard: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 14,
  },
  spotlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  spotlightLabel: {
    color: '#7f94ad',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  spotlightValue: {
    color: '#f4f7fb',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  spotlightAmount: {
    color: '#3dd6a5',
    fontSize: 22,
    fontWeight: '900',
  },
  spotlightMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  spotlightMetaText: {
    color: '#b8c7da',
    fontSize: 13,
    fontWeight: '700',
  },
  spotlightMetaDot: {
    color: '#7f94ad',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 16,
  },
  cardBadge: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
