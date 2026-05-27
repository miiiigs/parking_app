import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

import { buildParkingBillBreakdown, formatElapsedTime, formatSecondsToHMS } from '../lib/billing';
import { getArrivalWindowOption } from '../lib/reservationOptions';
import type { ParkingSessionResult, ReservationResult } from '../lib/reservations';

type Props = {
  reservation: ReservationResult | null;
  parkingSession: ParkingSessionResult | null;
  selectedArrivalWindowMinutes: number;
  isSubmitting: boolean;
  errorMessage: string | null;
  onFinish: () => void;
  onBack: () => void;
};

function buildReceiptValue(parkingSession: ParkingSessionResult | null, reservation: ReservationResult | null) {
  if (!parkingSession || !reservation) {
    return '';
  }

  return [
    'parking-receipt',
    parkingSession.session_id,
    parkingSession.reservation_id,
    reservation.slot_id,
    String(parkingSession.billed_amount ?? parkingSession.reservation_fee ?? 0),
  ].join('|');
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not yet';
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) {
    return 'Not yet billed';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function formatReceiptNumber(sessionId: string | undefined) {
  if (!sessionId) {
    return 'Pending';
  }

  return `PT-${sessionId.slice(0, 8).toUpperCase()}`;
}

function formatPeso(value: number) {
  return `PHP ${value.toFixed(2)}`;
}

function buildReceiptHtml({
  ticketNumber,
  referenceId,
  slotLabel,
  reservationTypeLabel,
  plateNumber,
  startedAt,
  endedAt,
  billedMinutes,
  reservationFee,
  parkingFee,
  billedAmount,
  qrDataUrl,
}: {
  ticketNumber: string;
  referenceId: string;
  slotLabel: string;
  reservationTypeLabel: string;
  plateNumber: string;
  startedAt: string | null;
  endedAt: string | null;
  billedMinutes: number | null;
  reservationFee: number;
  parkingFee: number;
  billedAmount: number;
  qrDataUrl: string;
}) {
  const receiptDate = new Date().toLocaleString();

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0b1624; background: #f5f8fc; }
          .card { border: 1px solid #d7e0ea; border-radius: 18px; padding: 20px; background: #fff; box-shadow: 0 10px 30px rgba(8, 17, 29, 0.08); }
          h1 { margin: 0 0 8px; font-size: 24px; }
          .muted { color: #54657a; font-size: 12px; }
          .section { margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
          .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1.1px; color: #7b8ba1; font-weight: 700; margin-bottom: 10px; }
          .row { display: flex; justify-content: space-between; gap: 12px; margin: 10px 0; }
          .label { color: #5a6b7f; flex: 1; }
          .value { font-weight: bold; text-align: right; max-width: 55%; }
          .summary { background: #08111d; color: #fff; border-radius: 16px; padding: 16px; }
          .summary .label, .summary .value { color: #fff; }
          .summary .row { margin: 8px 0; }
          .summary .total .value { color: #3dd6a5; font-size: 18px; }
          .qr { margin: 18px 0; text-align: center; }
          .qr img { width: 168px; height: 168px; border: 12px solid #fff; border-radius: 20px; background: #fff; }
          .qr-fallback { color: #54657a; font-size: 12px; }
          .footer { margin-top: 16px; font-size: 12px; color: #5a6b7f; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Parking Ticket Receipt</h1>
          <div class="muted">Receipt generated ${receiptDate}</div>
          <div class="qr">${qrDataUrl ? `<img src="${qrDataUrl}" alt="Receipt QR" />` : '<div class="qr-fallback">Receipt QR unavailable.</div>'}</div>

          <div class="section">
            <div class="section-title">Ticket Details</div>
            <div class="row"><div class="label">Ticket No.</div><div class="value">${ticketNumber}</div></div>
            <div class="row"><div class="label">Reference ID</div><div class="value">${referenceId}</div></div>
            <div class="row"><div class="label">Reservation Type</div><div class="value">${reservationTypeLabel}</div></div>
            <div class="row"><div class="label">Slot</div><div class="value">${slotLabel}</div></div>
            <div class="row"><div class="label">Plate</div><div class="value">${plateNumber || 'N/A'}</div></div>
            <div class="row"><div class="label">Started</div><div class="value">${startedAt ? new Date(startedAt).toLocaleString() : 'Not yet'}</div></div>
            <div class="row"><div class="label">Ended</div><div class="value">${endedAt ? new Date(endedAt).toLocaleString() : 'Not yet'}</div></div>
          </div>

          <div class="section summary">
            <div class="section-title">Billing Breakdown</div>
            <div class="row"><div class="label">Reservation Fee</div><div class="value">PHP ${reservationFee.toFixed(2)}</div></div>
            <div class="row"><div class="label">Parking Fee</div><div class="value">PHP ${parkingFee.toFixed(2)}</div></div>
            <div class="row"><div class="label">Duration</div><div class="value">${billedMinutes ? `${billedMinutes} min` : 'Not yet billed'}</div></div>
            <div class="row total"><div class="label">Total</div><div class="value">PHP ${billedAmount.toFixed(2)}</div></div>
          </div>

          <div class="footer">This receipt can be used for parking payment tracking and support verification.</div>
        </div>
      </body>
    </html>
  `;
}

export function SessionScreen({
  reservation,
  parkingSession,
  selectedArrivalWindowMinutes,
  isSubmitting,
  errorMessage,
  onFinish,
  onBack,
}: Props) {
  const isCompleted = parkingSession?.session_status === 'completed';
  const reservationType = getArrivalWindowOption(selectedArrivalWindowMinutes);
  const reservationFee = Number(parkingSession?.reservation_fee ?? 0);
  const billBreakdown = buildParkingBillBreakdown({
    startedAt: parkingSession?.started_at ?? null,
    reservationFee,
  });
  const billedAmount = Number(parkingSession?.billed_amount ?? billBreakdown.total);
  const parkingFee = Math.max(0, billedAmount - reservationFee);
  const ticketNumber = formatReceiptNumber(parkingSession?.session_id);
  const receiptQrValue = buildReceiptValue(parkingSession, reservation);
  const receiptQrRef = useRef<any>(null);
  const receiptViewRef = useRef<any>(null);
  const [tick, setTick] = useState(() => new Date());
  const [isReceiptActionRunning, setIsReceiptActionRunning] = useState(false);
  const [receiptActionMessage, setReceiptActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isCompleted) {
      setTick(new Date());
      return undefined;
    }

    const timer = setInterval(() => {
      setTick(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [isCompleted, parkingSession?.started_at]);

  const liveBillBreakdown = buildParkingBillBreakdown({
    startedAt: parkingSession?.started_at ?? null,
    reservationFee,
    now: tick,
  });

  const activeElapsedMinutes = isCompleted && parkingSession?.billed_minutes ? parkingSession.billed_minutes : liveBillBreakdown.elapsedMinutes;
  const activeParkingFee = isCompleted ? parkingFee : liveBillBreakdown.parkingFee;
  const activeTotal = isCompleted ? billedAmount : liveBillBreakdown.total;

  // Compute a running HH:MM:SS label. For active sessions use started_at -> now (tick).
  // For completed sessions prefer started_at -> ended_at, fall back to billed_minutes if needed.
  let activeDurationLabel = '00:00:00';

  if (isCompleted) {
    if (parkingSession?.started_at && parkingSession?.ended_at) {
      const started = new Date(parkingSession.started_at).getTime();
      const ended = new Date(parkingSession.ended_at).getTime();
      if (!Number.isNaN(started) && !Number.isNaN(ended) && ended > started) {
        const secs = Math.floor((ended - started) / 1000);
        activeDurationLabel = formatSecondsToHMS(secs);
      } else if (parkingSession?.billed_minutes) {
        activeDurationLabel = formatSecondsToHMS(parkingSession.billed_minutes * 60);
      }
    } else if (parkingSession?.billed_minutes) {
      activeDurationLabel = formatSecondsToHMS(parkingSession.billed_minutes * 60);
    }
  } else {
    if (parkingSession?.started_at) {
      const started = new Date(parkingSession.started_at).getTime();
      if (!Number.isNaN(started)) {
        const nowTime = tick.getTime();
        const secs = Math.max(0, Math.floor((nowTime - started) / 1000));
        activeDurationLabel = formatSecondsToHMS(secs);
      }
    }
  }

  async function getReceiptQrDataUrl() {
    return await new Promise<string>((resolve) => {
      const qr = receiptQrRef.current;

      if (!qr || typeof qr.toDataURL !== 'function') {
        resolve('');
        return;
      }

      qr.toDataURL((data: string) => {
        resolve(`data:image/png;base64,${data}`);
      });
    });
  }

  async function shareReceipt() {
    if (!parkingSession || !reservation || isReceiptActionRunning) {
      return;
    }

    setIsReceiptActionRunning(true);
    setReceiptActionMessage(null);

    try {
      const qrDataUrl = await getReceiptQrDataUrl();
      const html = buildReceiptHtml({
        ticketNumber,
        referenceId: parkingSession.session_id,
        slotLabel: reservation?.slot_label ?? 'Unknown slot',
        reservationTypeLabel: reservationType.label,
        plateNumber: parkingSession.plate_number,
        startedAt: parkingSession.started_at,
        endedAt: parkingSession.ended_at,
        billedMinutes: parkingSession.billed_minutes,
        reservationFee,
        parkingFee: activeParkingFee,
        billedAmount,
        qrDataUrl,
      });

      // Use Print if available to generate a sharable PDF, otherwise fall back to sharing an image capture.
      let shared = false;

      try {
        // Attempt to use Print if available (may not exist in some clients).
        // Dynamically require to avoid crash when native module is absent.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Print = require('expo-print');
        if (Print && typeof Print.printToFileAsync === 'function') {
          const file = await Print.printToFileAsync({ html });
          const canShare = await Sharing.isAvailableAsync();

          if (canShare) {
            await Sharing.shareAsync(file.uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Share parking receipt',
              UTI: 'com.adobe.pdf',
            });
            shared = true;
          }
        }
      } catch (e) {
        // ignore and fall back to image capture
      }

      if (!shared) {
        // capture the receipt view as an image and share that
        const uri = await captureRef(receiptViewRef.current, { format: 'png', quality: 0.9, result: 'tmpfile' });
        const canShare = await Sharing.isAvailableAsync();

        if (!canShare) {
          setReceiptActionMessage('Sharing is not available on this device.');
          return;
        }

        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share parking receipt image' });
        setReceiptActionMessage('Receipt image ready to share.');
      }
    } catch (error) {
      setReceiptActionMessage(error instanceof Error ? error.message : 'Unable to share receipt right now.');
    } finally {
      setIsReceiptActionRunning(false);
    }
  }

  async function saveReceipt() {
    if (!parkingSession || !reservation || isReceiptActionRunning) {
      return;
    }

    setIsReceiptActionRunning(true);
    setReceiptActionMessage(null);

    try {
      // capture the receipt view and save to the user's photo library
      const qrDataUrl = await getReceiptQrDataUrl();
      const html = buildReceiptHtml({
        ticketNumber,
        referenceId: parkingSession.session_id,
        slotLabel: reservation?.slot_label ?? 'Unknown slot',
        reservationTypeLabel: reservationType.label,
        plateNumber: parkingSession.plate_number,
        startedAt: parkingSession.started_at,
        endedAt: parkingSession.ended_at,
        billedMinutes: parkingSession.billed_minutes,
        reservationFee,
        parkingFee: activeParkingFee,
        billedAmount,
        qrDataUrl,
      });
      try {
        // Request media-library permissions. Normalize response across SDK versions.
        const perm = await MediaLibrary.requestPermissionsAsync();
        // Some versions return { granted: boolean }, others return { status: 'granted'|'denied' }
        const granted = (perm as any).granted === true || (perm as any).status === 'granted';
        if (!granted) {
          setReceiptActionMessage('Permission to save to photos was denied.');
          return;
        }

        const uri = await captureRef(receiptViewRef.current, { format: 'png', quality: 0.9, result: 'tmpfile' });
        const asset = await MediaLibrary.createAssetAsync(uri);
        try {
          await MediaLibrary.createAlbumAsync('ParkingReceipts', asset, false);
        } catch (_) {
          // album creation may fail if it exists; ignore
        }

        setReceiptActionMessage('Receipt saved to your photos.');
      } catch (error) {
        setReceiptActionMessage(error instanceof Error ? error.message : 'Unable to create receipt image right now.');
      }
    } catch (error) {
      setReceiptActionMessage(error instanceof Error ? error.message : 'Unable to print receipt right now.');
    } finally {
      setIsReceiptActionRunning(false);
    }
  }

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

      <View style={styles.billSummaryCard}>
        <Text style={styles.billSummaryLabel}>{isCompleted ? 'Final Bill' : 'Current Bill'}</Text>
        <Text style={styles.billSummaryTotal}>{formatPeso(activeTotal)}</Text>
        <Text style={styles.billSummaryMeta}>Running time: {activeDurationLabel}</Text>
        <View style={styles.billSummaryDivider} />
        <View style={styles.billSummaryRow}>
          <Text style={styles.billSummaryItemLabel}>Reservation Fee</Text>
          <Text style={styles.billSummaryItemValue}>{formatPeso(reservationFee)}</Text>
        </View>
        <View style={styles.billSummaryRow}>
          <Text style={styles.billSummaryItemLabel}>Parking Fee</Text>
          <Text style={styles.billSummaryItemValue}>{formatPeso(activeParkingFee)}</Text>
        </View>
        <Text style={styles.billSummaryHint}>Parking: PHP 50 for the first 3 hours, then PHP 20 for each succeeding hour.</Text>
      </View>

      <View style={styles.card} ref={receiptViewRef} collapsable={false}>
        <Text style={styles.cardTitle}>{isCompleted ? 'Parking Ticket' : 'Live Session'}</Text>
        <Text style={styles.cardSubtitle}>
          {isCompleted
            ? 'Receipt and parking details for the completed stay.'
            : 'Live details update while the vehicle remains in the slot.'}
        </Text>

        {isCompleted ? (
          <View style={styles.qrPanel}>
            <View style={styles.qrBox}>
              <QRCode getRef={(c: any) => (receiptQrRef.current = c)} value={receiptQrValue || 'parking-receipt-unavailable'} size={160} color="#08111d" backgroundColor="#ffffff" />
            </View>
            <Text style={styles.qrCaption}>Scan this receipt QR for payment tracking and verification.</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Ticket No.</Text>
          <Text style={styles.rowValue}>{ticketNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">Reference ID</Text>
          <Text style={[styles.rowValue, styles.referenceValue]}>{parkingSession?.session_id ?? 'Pending'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Reservation Type</Text>
          <Text style={styles.rowValue}>{reservationType.label}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Slot</Text>
          <Text style={styles.rowValue}>{reservation?.slot_label ?? 'Unknown slot'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Plate</Text>
          <Text style={styles.rowValue}>{parkingSession?.plate_number ?? 'N/A'}</Text>
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
          <Text style={styles.rowLabel}>Running Time</Text>
          <Text style={styles.rowValue}>{activeDurationLabel}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Started</Text>
          <Text style={styles.rowValue}>{isCompleted ? formatDateTime(parkingSession?.started_at ?? null) : parkingSession?.started_at ? new Date(parkingSession.started_at).toLocaleTimeString() : 'Just now'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Ended</Text>
          <Text style={styles.rowValue}>{isCompleted ? formatDateTime(parkingSession?.ended_at ?? null) : parkingSession?.ended_at ? new Date(parkingSession.ended_at).toLocaleTimeString() : 'Not yet'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Reservation Fee</Text>
          <Text style={styles.rowValue}>{formatPeso(reservationFee)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Parking Fee</Text>
          <Text style={styles.rowValue}>{formatPeso(activeParkingFee)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Total Bill</Text>
          <Text style={styles.rowValue}>{formatPeso(activeTotal)}</Text>
        </View>
      </View>

      {isCompleted ? (
        <View style={styles.ticketFooter}>
          <Text style={styles.ticketFooterTitle}>Keep this receipt</Text>
          <Text style={styles.ticketFooterText}>
            This ticket shows the completed stay, the payment amount, and the parking window used for the reservation.
          </Text>
        </View>
      ) : null}

      {isCompleted ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => void shareReceipt()} disabled={isReceiptActionRunning}>
            <Text style={styles.actionButtonText}>{isReceiptActionRunning ? 'Preparing...' : 'Share Receipt'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => void saveReceipt()} disabled={isReceiptActionRunning}>
            <Text style={styles.actionButtonSecondaryText}>{isReceiptActionRunning ? 'Preparing...' : 'Save Receipt'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {receiptActionMessage ? <Text style={styles.receiptActionMessage}>{receiptActionMessage}</Text> : null}

      <View style={styles.buttonRow}>
        {isCompleted ? (
          <TouchableOpacity style={styles.primaryButton} onPress={onFinish} disabled={isSubmitting}>
            <Text style={styles.primaryButtonText}>Return Home</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={onFinish} disabled={isSubmitting}>
              <Text style={styles.primaryButtonText}>{isSubmitting ? 'Ending...' : 'Mark as Paid & End Session'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f1b2c',
    borderRadius: 24,
    padding: 20,
    // spacing handled per-element for wider RN support
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
    // spacing via children margins
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
    // spacing via children margins
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
  billSummaryCard: {
    backgroundColor: '#07111d',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d3552',
    gap: 8,
  },
  billSummaryLabel: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  billSummaryTotal: {
    color: '#f4f7fb',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  billSummaryMeta: {
    color: '#b8c7da',
    fontSize: 13,
    lineHeight: 18,
  },
  billSummaryDivider: {
    height: 1,
    backgroundColor: '#1e3550',
    marginVertical: 4,
  },
  billSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  billSummaryItemLabel: {
    color: '#b8c7da',
    fontSize: 14,
    flex: 1,
  },
  billSummaryItemValue: {
    color: '#3dd6a5',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  billSummaryHint: {
    color: '#8ea4bd',
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#08111d',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#18283f',
    // spacing applied to children to avoid layout overlap
  },
  cardTitle: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 16,
  },
  cardSubtitle: {
    color: '#8ea4bd',
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },
  qrPanel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  qrBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
  },
  qrCaption: {
    color: '#a8bbd2',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    color: '#b8c7da',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  rowValue: {
    color: '#3dd6a5',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    minWidth: 80,
  },
  referenceValue: {
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
    textAlign: 'right',
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
  ticketFooter: {
    backgroundColor: '#0b1624',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#223551',
    // spacing via children margins
  },
  ticketFooterTitle: {
    color: '#f4f7fb',
    fontWeight: '800',
    fontSize: 14,
  },
  ticketFooterText: {
    color: '#a8bbd2',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1a2e49',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#26405f',
  },
  actionButtonText: {
    color: '#f4f7fb',
    fontWeight: '800',
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#0f1b2c',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3c536f',
  },
  actionButtonSecondaryText: {
    color: '#f4f7fb',
    fontWeight: '800',
  },
  receiptActionMessage: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 18,
  },
});
