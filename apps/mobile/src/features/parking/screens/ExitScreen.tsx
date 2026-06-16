import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { CheckCircle2, Clock3, CreditCard, QrCode } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/layout/Screen';
import { QrPanel } from '../../../components/parking/QrPanel';
import { AppButton } from '../../../components/ui/AppButton';
import { DetailRow } from '../../../components/ui/DetailRow';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SurfaceCard } from '../../../components/ui/SurfaceCard';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { colors, spacing, typography } from '../../../theme/tokens';
import { formatDuration, formatTime } from '../../../utils/format';
import { formatParkingPricingSummary } from '@parking/shared';

function formatCountdown(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function ExitScreen() {
  const router = useRouter();
  const completedSession = useParkingFlowStore((state) => state.completedSession);
  const [remainingExitSeconds, setRemainingExitSeconds] = useState(0);

  useEffect(() => {
    if (!completedSession) {
      router.replace('/home');
    }
  }, [completedSession, router]);

  useEffect(() => {
    if (!completedSession?.exitGraceEndsAt) {
      setRemainingExitSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const endsAtMs = new Date(completedSession.exitGraceEndsAt ?? '').getTime();
      setRemainingExitSeconds(Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000)));
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [completedSession?.exitGraceEndsAt]);

  if (!completedSession) {
    return null;
  }

  return (
    <Screen>
      <SurfaceCard style={styles.heroCard}>
        <StatusBadge label="Payment successful" tone="success" />
        <Text style={styles.heroTitle}>Exit is ready.</Text>
        <Text style={styles.heroCopy}>Present this QR code at the barrier to complete departure.</Text>
        {completedSession.exitGraceEndsAt ? (
          <View style={styles.graceChip}>
            <Clock3 stroke={colors.surface} size={16} />
            <Text style={styles.graceChipText}>Exit grace: {formatCountdown(remainingExitSeconds)}</Text>
          </View>
        ) : null}
      </SurfaceCard>

      <QrPanel title="Exit QR code" caption="The exit token is tied to the paid session." code={completedSession.exitCode} />

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Final ticket</Text>
        <DetailRow label="Parking slot" value={completedSession.slot.number} icon={<QrCode stroke={colors.muted} size={16} />} />
        <DetailRow label="Plate" value={completedSession.plateNumber} icon={<QrCode stroke={colors.muted} size={16} />} />
        <DetailRow label="Rate" value={formatParkingPricingSummary(completedSession.pricingConfig)} icon={<CreditCard stroke={colors.muted} size={16} />} />
        <DetailRow label="Entry" value={formatTime(completedSession.startTime)} icon={<CheckCircle2 stroke={colors.muted} size={16} />} />
        <DetailRow label="Exit" value={formatTime(completedSession.endTime)} icon={<CheckCircle2 stroke={colors.muted} size={16} />} />
        <DetailRow label="Duration" value={formatDuration(completedSession.durationSeconds)} icon={<CheckCircle2 stroke={colors.muted} size={16} />} />
        <DetailRow label="Total paid" value={`PHP ${completedSession.totalBill.toFixed(2)}`} icon={<CreditCard stroke={colors.muted} size={16} />} />
        {completedSession.exitGraceEndsAt ? (
          <DetailRow label="Exit valid until" value={formatTime(completedSession.exitGraceEndsAt)} icon={<Clock3 stroke={colors.muted} size={16} />} />
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>What happens next</Text>
        <View style={styles.stepList}>
          <Text style={styles.stepCopy}>1. Drive to the exit gate.</Text>
          <Text style={styles.stepCopy}>2. Scan the exit QR code.</Text>
          <Text style={styles.stepCopy}>3. Open the official receipt after you leave the lot.</Text>
        </View>
      </SurfaceCard>

      <AppButton label="I've exited - view receipt" onPress={() => router.replace('/receipt')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: typography.title,
    fontWeight: '800',
  },
  heroCopy: {
    color: '#E7FFF5',
    fontSize: typography.body,
    lineHeight: 22,
  },
  graceChip: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  graceChipText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '700',
  },
  stepList: {
    gap: spacing.sm,
  },
  stepCopy: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
});

