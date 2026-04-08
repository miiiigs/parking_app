import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onValidate: () => void;
  onBack: () => void;
};

export function ValidationScreen({ onValidate, onBack }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Step 2 of 3</Text>
      <Text style={styles.title}>Validate the assigned slot.</Text>
      <Text style={styles.subtitle}>Scan the QR on the slot or confirm manually to start the session.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assigned Slot</Text>
        <Text style={styles.bigValue}>Slot #12</Text>
        <Text style={styles.helper}>QR must match the reserved slot before the timer starts.</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={onValidate}>
          <Text style={styles.primaryButtonText}>I’m Parked</Text>
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
    gap: 8,
  },
  cardTitle: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 16,
  },
  bigValue: {
    color: '#3dd6a5',
    fontSize: 30,
    fontWeight: '800',
  },
  helper: {
    color: '#b8c7da',
    fontSize: 14,
    lineHeight: 20,
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
