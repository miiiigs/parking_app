import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { ReservationResult } from '../lib/reservations';

type Props = {
  reservation: ReservationResult | null;
  assignedSlotLabel: string;
  slotQrToken: string;
  onSlotQrTokenChange: (value: string) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  onValidate: () => void;
  onBack: () => void;
};

export function ValidationScreen({
  reservation,
  assignedSlotLabel,
  slotQrToken,
  onSlotQrTokenChange,
  isSubmitting,
  errorMessage,
  onValidate,
  onBack,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Step 2 of 3</Text>
      <Text style={styles.title}>Validate the assigned slot.</Text>
      <Text style={styles.subtitle}>Scan the QR on the slot or confirm manually to start the session.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reservation Details</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Slot</Text>
          <Text style={styles.rowValue}>{reservation?.slot_label ?? assignedSlotLabel}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Status</Text>
          <Text style={styles.rowValue}>{reservation?.reservation_status ?? 'Pending'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Expires</Text>
          <Text style={styles.rowValue}>{reservation?.expires_at ? new Date(reservation.expires_at).toLocaleTimeString() : 'N/A'}</Text>
        </View>
        <Text style={styles.helper}>Validate the created reservation to start the parking session.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Slot QR Token</Text>
        <TextInput
          value={slotQrToken}
          onChangeText={onSlotQrTokenChange}
          placeholder="Paste or scan the slot QR token"
          placeholderTextColor="#5e7490"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Text style={styles.helper}>For now, paste the token from the assigned slot. QR camera scanning can come next.</Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}
          onPress={onValidate}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Starting...' : 'I’m Parked'}</Text>
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
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '700',
  },
  helper: {
    color: '#b8c7da',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#08111d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#18283f',
    color: '#f4f7fb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  errorText: {
    color: '#ff8a80',
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
  primaryButtonDisabled: {
    opacity: 0.7,
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
