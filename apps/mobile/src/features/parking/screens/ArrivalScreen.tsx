import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { CarFront, Clock3, CreditCard, MapPin, Timer } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/layout/Screen';
import { QrPanel } from '../../../components/parking/QrPanel';
import { AppButton } from '../../../components/ui/AppButton';
import { DetailRow } from '../../../components/ui/DetailRow';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SurfaceCard } from '../../../components/ui/SurfaceCard';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { colors, spacing, typography } from '../../../theme/tokens';
import { formatTime } from '../../../utils/format';
import { formatParkingPricingSummary } from '@parking/shared';

function formatCountdown(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export default function ArrivalScreen() {
  const router = useRouter();
  const booking = useParkingFlowStore((state) => state.booking);
  const session = useParkingFlowStore((state) => state.session);
  const startSession = useParkingFlowStore((state) => state.startSession);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      router.replace('/session');
    }
  }, [router, session]);

  useEffect(() => {
    if (!booking) {
      router.replace('/');
      return;
    }

    const updateTimer = () => {
      if (!booking.expiresAt) {
        setRemainingSeconds(0);
        return;
      }

      const expiryMs = new Date(booking.expiresAt).getTime();
      setRemainingSeconds(Math.max(0, Math.floor((expiryMs - Date.now()) / 1000)));
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [booking, router]);

  const entryQrValue = useMemo(() => {
    if (!booking) {
      return '';
    }

    return booking.qrToken ?? booking.slot.qrToken ?? booking.reservationCode;
  }, [booking]);

  if (!booking) {
    return null;
  }

  const isExpired = Boolean(booking.expiresAt) && remainingSeconds === 0;

  const handleStart = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await startSession(entryQrValue);
      router.replace('/session');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start the parking session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <SurfaceCard style={styles.heroCard}>
        <StatusBadge label="Reservation confirmed" tone="success" />
        <Text style={styles.heroTitle}>Present this entry QR at the gate.</Text>
        <Text style={styles.heroCopy}>Your reservation stays active while the countdown is running.</Text>
      </SurfaceCard>

      <QrPanel title="Entry QR" caption="Have the attendant scan this code to open the session." code={entryQrValue} />

      <SurfaceCard style={styles.timerCard}>
        <View style={styles.timerHeader}>
          <Timer stroke={colors.surface} size={20} />
          <Text style={styles.timerLabel}>Time left</Text>
        </View>
        <Text style={styles.timerValue}>{formatCountdown(remainingSeconds)}</Text>
        <Text style={styles.timerCopy}>
          Expires at {booking.expiresAt ? formatTime(booking.expiresAt) : 'N/A'}
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Reservation details</Text>
        <DetailRow label="Location" value={booking.lotName} icon={<MapPin stroke={colors.muted} size={16} />} />
        <DetailRow label="Slot" value={booking.slot.number} icon={<CarFront stroke={colors.muted} size={16} />} />
        <DetailRow label="Plate" value={booking.plateNumber} icon={<CarFront stroke={colors.muted} size={16} />} />
        <DetailRow label="Arrival window" value={`${booking.arrivalWindowMinutes} min`} icon={<Clock3 stroke={colors.muted} size={16} />} />
        <DetailRow label="Rate" value={formatParkingPricingSummary(booking.pricingConfig)} icon={<CreditCard stroke={colors.muted} size={16} />} />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Next steps</Text>
        <View style={styles.stepList}>
          <Text style={styles.stepCopy}>1. Arrive within the remaining time.</Text>
          <Text style={styles.stepCopy}>2. Present the entry QR at the gate.</Text>
          <Text style={styles.stepCopy}>3. Start the parking session once admitted.</Text>
        </View>
      </SurfaceCard>

      {isExpired ? <Text style={styles.errorText}>This reservation has expired. Reserve another slot to continue.</Text> : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <AppButton
        label={isSubmitting ? 'Starting...' : 'I presented the entry QR'}
        onPress={handleStart}
        loading={isSubmitting}
        disabled={isExpired || isSubmitting}
      />
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
  timerCard: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    gap: spacing.xs,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timerLabel: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timerValue: {
    color: colors.surface,
    fontSize: typography.hero,
    fontWeight: '800',
  },
  timerCopy: {
    color: '#D7F3E8',
    fontSize: typography.body,
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
  errorText: {
    color: colors.danger,
    fontSize: typography.body,
    lineHeight: 20,
  },
});
