import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onContinue: () => void;
  onBack: () => void;
};

const slots = ['Slot #12', 'Slot #13', 'Slot #14'];
const windows = ['Within 30 mins', 'Within 1 hour', 'Within 2 hours'];

export function ReservationScreen({ onContinue, onBack }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Step 1 of 3</Text>
      <Text style={styles.title}>Reserve a real slot.</Text>
      <Text style={styles.subtitle}>Choose a controlled slot and an arrival window.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Available Slots</Text>
        {slots.map((slot) => (
          <View key={slot} style={styles.row}>
            <Text style={styles.rowLabel}>{slot}</Text>
            <Text style={styles.rowValue}>{slot === 'Slot #12' ? 'Recommended' : 'Available'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Arrival Window</Text>
        {windows.map((window) => (
          <View key={window} style={styles.row}>
            <Text style={styles.rowLabel}>{window}</Text>
            <Text style={styles.rowValue}>{window === 'Within 1 hour' ? 'Selected' : 'Fee varies'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
          <Text style={styles.primaryButtonText}>Confirm Reservation</Text>
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
    gap: 10,
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
    color: '#f4f7fb',
    fontSize: 14,
  },
  rowValue: {
    color: '#7bd3ff',
    fontSize: 14,
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
