import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { CreditCard, MapPin, Timer } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/layout/Screen';
import { AppButton } from '../../../components/ui/AppButton';
import { DetailRow } from '../../../components/ui/DetailRow';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SurfaceCard } from '../../../components/ui/SurfaceCard';
import { calculateBill } from '../lib/flow';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { formatTime, formatTimer } from '../../../utils/format';
import { calculateParkingCharge, formatParkingPricingSummary } from '@parking/shared';

export default function SessionScreen() {
  const router = useRouter();
  const session = useParkingFlowStore((state) => state.session);
  const finishSession = useParkingFlowStore((state) => state.finishSession);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      router.replace('/');
      return;
    }

    const update = () => {
      const startTime = new Date(session.startTime).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)));
    };

    update();
    const intervalId = setInterval(update, 1000);
    return () => clearInterval(intervalId);
  }, [router, session]);

  const currentBill = useMemo(() => {
    if (!session) {
      return 0;
    }

    return calculateBill(elapsedSeconds, session.pricingConfig);
  }, [elapsedSeconds, session]);

  const pricingQuote = useMemo(() => {
    if (!session) {
      return null;
    }

    return calculateParkingCharge(elapsedSeconds, session.pricingConfig);
  }, [elapsedSeconds, session]);

  if (!session) {
    return null;
  }

  const handleEndSession = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await finishSession(elapsedSeconds);
      router.replace('/exit');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to settle the session right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <SurfaceCard style={styles.timerCard}>
        <StatusBadge label="Session in progress" tone="info" />
        <View style={styles.timerBlock}>
          <Timer stroke={colors.surface} size={44} />
          <Text style={styles.timerValue}>{formatTimer(elapsedSeconds)}</Text>
          <Text style={styles.timerCaption}>Started at {formatTime(session.startTime)}</Text>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Current bill</Text>
        <View style={styles.billPanel}>
          <Text style={styles.billValue}>PHP {currentBill.toFixed(2)}</Text>
          <Text style={styles.billCaption}>{pricingQuote?.currentTierLabel ?? 'Live parking rate'}</Text>
        </View>
        {pricingQuote && pricingQuote.graceRemainingSeconds > 0 ? (
          <Text style={styles.graceCopy}>
            Entry grace period active: {formatTimer(pricingQuote.graceRemainingSeconds)} remaining before billable minutes begin.
          </Text>
        ) : null}
        <Text style={styles.settlementCopy}>The backend records the final settlement when you end the session.</Text>
        <DetailRow label="Rate" value={formatParkingPricingSummary(session.pricingConfig)} icon={<CreditCard stroke={colors.muted} size={16} />} />
        <DetailRow label="Slot" value={session.slot.number} icon={<MapPin stroke={colors.muted} size={16} />} />
        <DetailRow label="Plate" value={session.plateNumber} icon={<MapPin stroke={colors.muted} size={16} />} />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Parking details</Text>
        <Text style={styles.locationTitle}>{session.lotName}</Text>
        <Text style={styles.locationCopy}>{session.address}</Text>
      </SurfaceCard>

      <AppButton label="Settle payment & end session" onPress={handleEndSession} variant="danger" loading={isSubmitting} />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  timerCard: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  timerBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  timerValue: {
    color: colors.surface,
    fontSize: typography.hero,
    fontWeight: '800',
    letterSpacing: -1,
  },
  timerCaption: {
    color: '#D7F3E8',
    fontSize: typography.body,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '700',
  },
  billPanel: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  billValue: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '800',
  },
  billCaption: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  settlementCopy: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  graceCopy: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  locationTitle: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '700',
  },
  locationCopy: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.body,
    lineHeight: 20,
  },
});

