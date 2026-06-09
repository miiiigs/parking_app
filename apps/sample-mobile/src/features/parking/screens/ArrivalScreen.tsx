import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { CarFront, Clock3, CreditCard, MapPin } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/layout/Screen';
import { QrPanel } from '../../../components/parking/QrPanel';
import { AppButton } from '../../../components/ui/AppButton';
import { DetailRow } from '../../../components/ui/DetailRow';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SurfaceCard } from '../../../components/ui/SurfaceCard';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { colors, spacing, typography } from '../../../theme/tokens';

export default function ArrivalScreen() {
  const router = useRouter();
  const { booking, startSession } = useParkingFlowStore((state) => ({
    booking: state.booking,
    startSession: state.startSession,
  }));

  useEffect(() => {
    if (!booking) {
      router.replace('/');
    }
  }, [booking, router]);

  if (!booking) {
    return null;
  }

  const handleStart = () => {
    startSession();
    router.replace('/session');
  };

  return (
    <Screen>
      <SurfaceCard style={styles.heroCard}>
        <StatusBadge label="Reservation confirmed" tone="success" />
        <Text style={styles.heroTitle}>Present this QR code at the entry barrier.</Text>
        <Text style={styles.heroCopy}>Your slot is reserved until the selected arrival window expires.</Text>
      </SurfaceCard>

      <QrPanel title="Entry QR code" caption="Scan at the gate or present to the attendant." code={booking.reservationCode} />

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Reservation details</Text>
        <DetailRow label="Location" value={booking.lotName} icon={<MapPin stroke={colors.muted} size={16} />} />
        <DetailRow label="Slot" value={booking.slot.number} icon={<CarFront stroke={colors.muted} size={16} />} />
        <DetailRow label="Plate" value={booking.plateNumber} icon={<CarFront stroke={colors.muted} size={16} />} />
        <DetailRow label="Arrival window" value={`${booking.arrivalWindowMinutes} min`} icon={<Clock3 stroke={colors.muted} size={16} />} />
        <DetailRow label="Rate" value={`$${booking.pricePerHour}/hour`} icon={<CreditCard stroke={colors.muted} size={16} />} />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Next steps</Text>
        <View style={styles.stepList}>
          <Text style={styles.stepCopy}>1. Arrive within the selected window.</Text>
          <Text style={styles.stepCopy}>2. Scan the entry QR code.</Text>
          <Text style={styles.stepCopy}>3. Park in slot {booking.slot.number}.</Text>
          <Text style={styles.stepCopy}>4. Start the session once the vehicle is parked.</Text>
        </View>
      </SurfaceCard>

      <AppButton label="I've arrived - start session" onPress={handleStart} />
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

