import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { CheckCircle2, Clock3, Download, Home, MapPin, QrCode } from 'lucide-react-native';

import { Screen } from '../../../components/layout/Screen';
import { QrPanel } from '../../../components/parking/QrPanel';
import { AppButton } from '../../../components/ui/AppButton';
import { DetailRow } from '../../../components/ui/DetailRow';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SurfaceCard } from '../../../components/ui/SurfaceCard';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { colors, spacing, typography } from '../../../theme/tokens';
import { formatDateTime, formatDuration } from '../../../utils/format';

export default function ReceiptScreen() {
  const router = useRouter();
  const completedSession = useParkingFlowStore((state) => state.completedSession);
  const resetFlow = useParkingFlowStore((state) => state.resetFlow);
  const receiptRef = useRef<View>(null);
  const qrRef = useRef<any>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!completedSession) {
      router.replace('/');
    }
  }, [completedSession, router]);

  const receiptQrValue = useMemo(() => {
    if (!completedSession) {
      return '';
    }

    const referenceId = completedSession.sessionId ?? completedSession.reservationId ?? completedSession.reservationCode;

    return [
      'parking-receipt',
      referenceId,
      completedSession.reservationId ?? completedSession.reservationCode,
      completedSession.slot.id,
      String(completedSession.totalBill ?? 0),
    ].join('|');
  }, [completedSession]);

  if (!completedSession) {
    return null;
  }

  const session = completedSession;

  async function saveReceipt() {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    setActionMessage(null);

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      const granted = permission.granted || permission.status === 'granted';

      if (!granted) {
        setActionMessage('Permission to save to photos was denied.');
        return;
      }

      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 0.95,
        result: 'tmpfile',
      });

      const asset = await MediaLibrary.createAssetAsync(uri);

      try {
        await MediaLibrary.createAlbumAsync('ParkingReceipts', asset, false);
      } catch {
        // album may already exist
      }

      setActionMessage('Receipt saved to your photos.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to save receipt right now.');
    } finally {
      setIsWorking(false);
    }
  }

  const handleBackHome = async () => {
    await resetFlow();
    setTimeout(() => {
      router.replace('/');
    }, 300);
  };

  return (
    <Screen>
      <SurfaceCard>
        <StatusBadge label="Session complete" tone="success" />
        <View style={styles.headerBlock}>
          <CheckCircle2 stroke={colors.primary} size={42} />
          <Text style={styles.title}>Thank you for using ParkEasy.</Text>
          <Text style={styles.copy}>The receipt is ready to save locally.</Text>
        </View>
      </SurfaceCard>

      <View ref={receiptRef} collapsable={false}>
        <QrPanel
          title="Receipt QR"
          caption="Scan this QR for verification and receipt tracking."
          code={receiptQrValue}
          qrRef={qrRef}
        />

        <SurfaceCard>
          <Text style={styles.sectionTitle}>Official receipt</Text>
          <Text style={styles.receiptNumber}>#{session.receiptNumber}</Text>
          <DetailRow label="Location" value={session.lotName} icon={<MapPin stroke={colors.muted} size={16} />} />
          <DetailRow label="Address" value={session.address} icon={<MapPin stroke={colors.muted} size={16} />} />
          <DetailRow label="Slot" value={session.slot.number} icon={<MapPin stroke={colors.muted} size={16} />} />
          <DetailRow label="Plate" value={session.plateNumber} icon={<MapPin stroke={colors.muted} size={16} />} />
          <DetailRow label="Entry" value={formatDateTime(session.startTime)} icon={<Clock3 stroke={colors.muted} size={16} />} />
          <DetailRow label="Exit" value={formatDateTime(session.endTime)} icon={<Clock3 stroke={colors.muted} size={16} />} />
          <DetailRow label="Duration" value={formatDuration(session.durationSeconds)} icon={<Clock3 stroke={colors.muted} size={16} />} />
          <DetailRow label="Transaction" value={session.transactionId} icon={<Download stroke={colors.muted} size={16} />} />
          <DetailRow label="Total paid" value={`PHP ${session.totalBill.toFixed(2)}`} icon={<Download stroke={colors.muted} size={16} />} />
        </SurfaceCard>
      </View>

      <View style={styles.actionGroup}>
        <AppButton label={isWorking ? 'Saving...' : 'Save image'} onPress={() => void saveReceipt()} variant="secondary" loading={isWorking} />
        <AppButton label="Back home" onPress={() => void handleBackHome()} />
      </View>

      {actionMessage ? (
        <SurfaceCard>
          <Text style={styles.noteCopy}>{actionMessage}</Text>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <View style={styles.noteRow}>
          <Home stroke={colors.info} size={18} />
          <Text style={styles.noteCopy}>Bundle identifiers and store assets still need final project values before commercial release.</Text>
        </View>
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '800',
    textAlign: 'center',
  },
  copy: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '700',
  },
  receiptNumber: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  actionGroup: {
    gap: spacing.md,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noteCopy: {
    color: colors.muted,
    fontSize: typography.body,
    flex: 1,
    lineHeight: 22,
  },
});
