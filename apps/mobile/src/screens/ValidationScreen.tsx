import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [scanMessage, setScanMessage] = useState('Press Scan QR to open the camera.');
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const hasTriggeredValidation = useRef(false);

  useEffect(() => {
    hasTriggeredValidation.current = false;
    setIsScannerVisible(false);
    setScanMessage('Press Scan QR to open the camera.');
  }, [expectedQrToken, reservation?.reservation_id]);

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
    setIsScannerVisible(false);
    setScanMessage('QR matched. Starting the parking session.');
    onValidate(value);
  }

  async function openScanner() {
    if (isSubmitting || hasTriggeredValidation.current) {
      return;
    }

    const currentPermission = permission?.granted ? permission : await requestPermission();

    if (!currentPermission?.granted) {
      setScanMessage('Camera permission is required to scan QR codes.');
      return;
    }

    setScanMessage('Align the slot QR inside the frame.');
    setIsScannerVisible(true);
  }

  return (
    <View style={styles.container}>
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <Text style={styles.kickerText}>Step 2 of 3</Text>
        <Text style={styles.heroTitle}>Scan or Confirm</Text>
        <Text style={styles.heroSubtitle}>Validate your parking session by scanning the slot QR or entering it manually.</Text>
      </View>

      {/* Reservation Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your Reservation</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Slot</Text>
          <Text style={styles.detailValue}>{reservation?.slot_label ?? assignedSlotLabel}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expires</Text>
          <Text style={styles.detailValue}>
            {reservation?.expires_at ? new Date(reservation.expires_at).toLocaleTimeString() : 'N/A'}
          </Text>
        </View>
      </View>

      {/* QR Token Input Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Validation</Text>
        
        {/* Scan Button - Primary Action */}
        <TouchableOpacity
          style={[styles.scanButton, isSubmitting && styles.scanButtonDisabled]}
          onPress={() => void openScanner()}
          disabled={isSubmitting}
        >
          <Text style={styles.scanButtonText}>📷 Scan QR</Text>
        </TouchableOpacity>

        {/* Manual Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Manual Entry</Text>
          <TextInput
            value={slotQrToken}
            onChangeText={onSlotQrTokenChange}
            placeholder="Paste token here"
            placeholderTextColor="#5e7490"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Text style={styles.inputHelper}>Use if scanning is unavailable</Text>
        </View>

        {/* Status Message */}
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{scanMessage}</Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          onPress={() => onValidate(slotQrToken.trim() || undefined)}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Validating...' : '✓ Im Parked'}</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Modal */}
      <Modal
        visible={isScannerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsScannerVisible(false)}
      >
        <View style={styles.scannerModal}>
          <View style={styles.scannerHeader}>
            <View style={styles.scannerHeaderCopy}>
              <Text style={styles.scannerTitle}>Scan the slot QR</Text>
            </View>
            <TouchableOpacity
              style={styles.closeScannerButton}
              onPress={() => setIsScannerVisible(false)}
            >
              <Text style={styles.closeScannerText}>Close</Text>
            </TouchableOpacity>
          </View>

          {permission?.granted ? (
            <View style={styles.cameraWrapper}>
              <View style={styles.cameraFrame}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={(event: { data: string }) => handleBarcodeScanned(event.data)}
                />
              </View>
              <Text style={styles.cameraHint}>Point the camera at the QR sticker on the assigned slot.</Text>
            </View>
          ) : (
            <View style={styles.permissionCard}>
              <Text style={styles.helper}>Camera permission is required to scan QR codes.</Text>
              <TouchableOpacity style={styles.permissionButton} onPress={() => void openScanner()}>
                <Text style={styles.permissionButtonText}>Allow Camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.buttonGroup}>
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
    gap: 14,
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
  card: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  cardLabel: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
  scanButton: {
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    color: '#071018',
    fontWeight: '800',
    fontSize: 16,
  },
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    color: '#b8c7da',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0a1320',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#18283f',
    color: '#f4f7fb',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  inputHelper: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 16,
  },
  statusBox: {
    backgroundColor: '#0a1320',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#18283f',
    marginTop: 4,
  },
  statusText: {
    color: '#7bd3ff',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
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
  scannerModal: {
    flex: 1,
    backgroundColor: '#0b1320',
    padding: 20,
    gap: 16,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  scannerHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  scannerTitle: {
    color: '#f4f7fb',
    fontSize: 20,
    fontWeight: '800',
  },
  closeScannerButton: {
    backgroundColor: '#1a2e49',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#26405f',
  },
  closeScannerText: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 13,
  },
  cameraWrapper: {
    gap: 10,
  },
  cameraFrame: {
    position: 'relative',
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  camera: {
    height: 380,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cameraHint: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
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
    fontSize: 13,
  },
  helper: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 16,
  },
});
