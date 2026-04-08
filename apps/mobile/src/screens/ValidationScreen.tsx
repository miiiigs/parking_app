import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import type { ReservationResult } from '../lib/reservations';

type Props = {
  reservation: ReservationResult | null;
  assignedSlotLabel: string;
  expectedQrToken: string;
  slotQrToken: string;
  onSlotQrTokenChange: (value: string) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  onValidate: (slotQrToken?: string) => void;
  onBack: () => void;
};

export function ValidationScreen({
  reservation,
  assignedSlotLabel,
  expectedQrToken,
  slotQrToken,
  onSlotQrTokenChange,
  isSubmitting,
  errorMessage,
  onValidate,
  onBack,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMessage, setScanMessage] = useState('Align the slot QR inside the frame.');
  const hasTriggeredValidation = useRef(false);

  useEffect(() => {
    hasTriggeredValidation.current = false;
    setScanMessage('Align the slot QR inside the frame.');
  }, [expectedQrToken, reservation?.reservation_id]);

  useEffect(() => {
    if (!permission) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  function handleBarcodeScanned(value: string) {
    if (isSubmitting || hasTriggeredValidation.current) {
      return;
    }

    onSlotQrTokenChange(value);

    if (value !== expectedQrToken) {
      setScanMessage('This QR does not match the assigned slot. Try the correct slot sticker.');
      return;
    }

    hasTriggeredValidation.current = true;
    setScanMessage('QR matched. Starting the parking session.');
    onValidate(value);
  }

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
        {permission?.granted ? (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={(event: { data: string }) => handleBarcodeScanned(event.data)}
            />
            <Text style={styles.cameraHint}>Scan the QR sticker on the assigned slot.</Text>
          </View>
        ) : (
          <View style={styles.permissionCard}>
            <Text style={styles.helper}>Camera permission is required to scan QR codes.</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={() => void requestPermission()}>
              <Text style={styles.permissionButtonText}>Allow Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          value={slotQrToken}
          onChangeText={onSlotQrTokenChange}
          placeholder="Scanned QR token will appear here"
          placeholderTextColor="#5e7490"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Text style={styles.helper}>Manual entry still works if the camera cannot read the code immediately.</Text>
      </View>

      <Text style={styles.scanMessage}>{scanMessage}</Text>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}
          onPress={() => onValidate(slotQrToken.trim() || undefined)}
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
  cameraWrapper: {
    gap: 10,
  },
  camera: {
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cameraHint: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 18,
  },
  permissionCard: {
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#08111d',
    borderWidth: 1,
    borderColor: '#18283f',
  },
  permissionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a2e49',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#26405f',
  },
  permissionButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
  },
  scanMessage: {
    color: '#7bd3ff',
    fontSize: 13,
    lineHeight: 18,
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
