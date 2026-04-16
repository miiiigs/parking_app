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
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <Text style={styles.kickerText}>Step 3 of 3</Text>
        <Text style={styles.heroTitle}>{isCompleted ? 'Session Complete' : 'Parking Active'}</Text>
        <Text style={styles.heroSubtitle}>
          {isCompleted ? 'Your parking session has ended and payment has been processed.' : 'Your timer is running. Payment updates in real time.'}
        </Text>
      </View>

      {/* Status Messages */}
      {errorMessage ? (
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>⚠ Error</Text>
          <Text style={styles.alertText}>{errorMessage}</Text>
        </View>
      ) : isCompleted ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>✓ Payment Recorded</Text>
          <Text style={styles.successText}>Slot released and available for others</Text>
        </View>
      ) : null}

      {/* Spotlight Card - Timer & Amount */}
      <View style={styles.spotlightCard}>
        <View style={styles.spotlightContent}>
          <View>
            <Text style={styles.spotlightLabel}>Session Status</Text>
            <Text style={styles.spotlightTimer}>{isCompleted ? 'Closed' : 'Running'}</Text>
          </View>
          <View style={styles.spotlightDivider} />
          <View style={styles.spotlightAmountSection}>
            <Text style={styles.spotlightLabel}>Total Amount</Text>
            <Text style={styles.spotlightAmount}>PHP {billedAmount.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Session Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Parking Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Slot</Text>
          <Text style={styles.detailValue}>{reservation?.slot_label ?? 'Unknown'}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>{parkingSession?.session_status ?? 'Active'}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vehicle</Text>
          <Text style={styles.detailValue}>{parkingSession?.plate_number ?? 'N/A'}</Text>
        </View>
        {parkingSession?.started_at && (
          <>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Started</Text>
              <Text style={styles.detailValue}>{new Date(parkingSession.started_at).toLocaleTimeString()}</Text>
            </View>
          </>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack} disabled={isSubmitting}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          onPress={onFinish}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>{isCompleted ? 'Return Home' : isSubmitting ? 'Processing...' : '✓ Complete Session'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#111c2d',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1b2b43',
  },
  kickerText: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#f4f7fb',
    fontSize: 26,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#b8c7da',
    fontSize: 14,
    lineHeight: 20,
  },
  alertBox: {
    backgroundColor: '#2a1114',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#8f3c46',
    gap: 4,
  },
  alertTitle: {
    color: '#ff8a80',
    fontWeight: '800',
    fontSize: 13,
  },
  alertText: {
    color: '#f2c9cd',
    fontSize: 12,
    lineHeight: 16,
  },
  successBox: {
    backgroundColor: '#0e231a',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2d7f63',
    gap: 4,
  },
  successTitle: {
    color: '#3dd6a5',
    fontWeight: '800',
    fontSize: 13,
  },
  successText: {
    color: '#c6f2e4',
    fontSize: 12,
    lineHeight: 16,
  },
  spotlightCard: {
    backgroundColor: '#0f1b2c',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#1a2e49',
  },
  spotlightContent: {
    gap: 0,
  },
  spotlightDivider: {
    height: 1,
    backgroundColor: '#1a2e49',
    marginVertical: 16,
  },
  spotlightLabel: {
    color: '#7bd3ff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  spotlightTimer: {
    color: '#f4f7fb',
    fontSize: 28,
    fontWeight: '900',
  },
  spotlightAmountSection: {
    gap: 0,
  },
  spotlightAmount: {
    color: '#3dd6a5',
    fontSize: 28,
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    gap: 0,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  cardLabel: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  detailLabel: {
    color: '#b8c7da',
    fontSize: 13,
  },
  detailValue: {
    color: '#f4f7fb',
    fontSize: 13,
    fontWeight: '700',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#1a2e49',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#071018',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1a2e49',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#26405f',
  },
  secondaryButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 15,
  },
});
