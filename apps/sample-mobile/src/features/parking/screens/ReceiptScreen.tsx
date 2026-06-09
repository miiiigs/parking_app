import { Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Clock3, Download, Home, MapPin } from 'lucide-react-native';

import { Screen } from '../../../components/layout/Screen';
import { AppButton } from '../../../components/ui/AppButton';
import { DetailRow } from '../../../components/ui/DetailRow';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SurfaceCard } from '../../../components/ui/SurfaceCard';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { colors, spacing, typography } from '../../../theme/tokens';
import { formatDateTime, formatDuration } from '../../../utils/format';

export default function ReceiptScreen() {
  const router = useRouter();
  const { completedSession, resetFlow } = useParkingFlowStore((state) => ({
    completedSession: state.completedSession,
    resetFlow: state.resetFlow,
  }));

  if (!completedSession) {
    router.replace('/');
    return null;
  }

  const handleShare = async () => {
    await Share.share({
      title: `Receipt ${completedSession.receiptNumber}`,
      message: [
        `Receipt ${completedSession.receiptNumber}`,
        completedSession.lotName,
        `Slot ${completedSession.slot.number}`,
        `Paid $${completedSession.totalBill.toFixed(2)}`,
        `Transaction ${completedSession.transactionId}`,
      ].join('\n'),
    });
  };

  const handleBackHome = () => {
    resetFlow();
    router.replace('/');
  };

  return (
    <Screen>
      <SurfaceCard>
        <StatusBadge label="Session complete" tone="success" />
        <View style={styles.headerBlock}>
          <CheckCircle2 stroke={colors.primary} size={42} />
          <Text style={styles.title}>Thank you for using ParkEasy.</Text>
          <Text style={styles.copy}>The payment record is persisted locally and ready to share.</Text>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Official receipt</Text>
        <Text style={styles.receiptNumber}>#{completedSession.receiptNumber}</Text>
        <DetailRow label="Location" value={completedSession.lotName} icon={<MapPin stroke={colors.muted} size={16} />} />
        <DetailRow label="Address" value={completedSession.address} icon={<MapPin stroke={colors.muted} size={16} />} />
        <DetailRow label="Slot" value={completedSession.slot.number} icon={<MapPin stroke={colors.muted} size={16} />} />
        <DetailRow label="Plate" value={completedSession.plateNumber} icon={<MapPin stroke={colors.muted} size={16} />} />
        <DetailRow label="Entry" value={formatDateTime(completedSession.startTime)} icon={<Clock3 stroke={colors.muted} size={16} />} />
        <DetailRow label="Exit" value={formatDateTime(completedSession.endTime)} icon={<Clock3 stroke={colors.muted} size={16} />} />
        <DetailRow label="Duration" value={formatDuration(completedSession.durationSeconds)} icon={<Clock3 stroke={colors.muted} size={16} />} />
        <DetailRow label="Transaction" value={completedSession.transactionId} icon={<Download stroke={colors.muted} size={16} />} />
        <DetailRow label="Total paid" value={`$${completedSession.totalBill.toFixed(2)}`} icon={<Download stroke={colors.muted} size={16} />} />
      </SurfaceCard>

      <View style={styles.actionGroup}>
        <AppButton label="Share receipt" onPress={handleShare} variant="secondary" />
        <AppButton label="Back home" onPress={handleBackHome} />
      </View>

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

