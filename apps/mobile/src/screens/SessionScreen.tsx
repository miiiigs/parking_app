import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ParkingSessionResult, ReservationResult } from '../lib/reservations';

type Props = {
  reservation: ReservationResult | null;
  parkingSession: ParkingSessionResult | null;
  onFinish: () => void;
  onBack: () => void;
};

export function SessionScreen({ reservation, parkingSession, onFinish, onBack }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Step 3 of 3</Text>
      <Text style={styles.title}>Parking session active.</Text>
      <Text style={styles.subtitle}>The timer starts after validation and billing updates in real time.</Text>

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
          <Text style={styles.rowLabel}>Started</Text>
          <Text style={styles.rowValue}>
            {parkingSession?.started_at ? new Date(parkingSession.started_at).toLocaleTimeString() : 'Just now'}
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
        <TouchableOpacity style={styles.primaryButton} onPress={onFinish}>
          <Text style={styles.primaryButtonText}>Mark as Paid</Text>
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
