import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  locationName: string;
  locationAddress: string;
  slotCountLabel: string;
  isLoading: boolean;
  onStartReservation: () => void;
  onViewSession: () => void;
};

export function HomeScreen({
  locationName,
  locationAddress,
  slotCountLabel,
  isLoading,
  onStartReservation,
  onViewSession,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Smart Parking Reservation</Text>
      <Text style={styles.title}>Guaranteed parking before you arrive.</Text>
      <Text style={styles.subtitle}>
        Reserve a specific slot, validate on site, and pay only for the time you actually use.
      </Text>
      <View style={styles.liveCard}>
        <Text style={styles.liveLabel}>Live Location</Text>
        <Text style={styles.liveValue}>{locationName}</Text>
        <Text style={styles.liveHelper}>{locationAddress}</Text>
        <Text style={styles.liveStatus}>{isLoading ? 'Loading live data...' : slotCountLabel}</Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={onStartReservation}>
          <Text style={styles.primaryButtonText}>Reserve a Slot</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onViewSession}>
          <Text style={styles.secondaryButtonText}>View Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#12233a',
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  kicker: {
    color: '#7bd3ff',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  title: {
    color: '#f4f7fb',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  subtitle: {
    color: '#b8c7da',
    fontSize: 16,
    lineHeight: 24,
  },
  liveCard: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#18283f',
    gap: 6,
  },
  liveLabel: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  liveValue: {
    color: '#f4f7fb',
    fontSize: 18,
    fontWeight: '800',
  },
  liveHelper: {
    color: '#b8c7da',
    fontSize: 14,
  },
  liveStatus: {
    color: '#3dd6a5',
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 16,
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
    fontSize: 16,
  },
});
