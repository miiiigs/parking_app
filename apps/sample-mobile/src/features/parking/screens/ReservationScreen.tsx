import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock3 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../../components/layout/Screen';
import { ParkingMap } from '../../../components/parking/ParkingMap';
import { AppButton } from '../../../components/ui/AppButton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SurfaceCard } from '../../../components/ui/SurfaceCard';
import { getParkingLotById } from '../data/parkingLots';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import type { ParkingSlot } from '../types';
import { colors, radius, spacing, typography } from '../../../theme/tokens';

const arrivalWindows = [30, 60, 120];

export default function ReservationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lotId?: string }>();
  const reserveSlot = useParkingFlowStore((state) => state.reserveSlot);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [arrivalWindowMinutes, setArrivalWindowMinutes] = useState(30);
  const [plateNumber, setPlateNumber] = useState('');

  const lot = useMemo(() => getParkingLotById(String(params.lotId ?? '')), [params.lotId]);

  if (!lot) {
    return (
      <Screen>
        <SurfaceCard>
          <Text style={styles.title}>Parking lot not found.</Text>
          <AppButton label="Back to home" onPress={() => router.replace('/')} />
        </SurfaceCard>
      </Screen>
    );
  }

  const normalizedPlateNumber = plateNumber.toUpperCase().replace(/[^A-Z0-9-]/g, '');

  const handleConfirm = () => {
    if (!selectedSlot || normalizedPlateNumber.length < 5) {
      return;
    }

    reserveSlot({ lot, slot: selectedSlot, arrivalWindowMinutes, plateNumber: normalizedPlateNumber });
    router.replace('/arrival');
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft stroke={colors.text} size={20} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Select parking slot</Text>
          <Text style={styles.subtitle}>{lot.name}</Text>
        </View>
      </View>

      <SurfaceCard>
        <StatusBadge label={`${lot.availableSlots} live slots available`} tone="success" />
        <ParkingMap slots={lot.slots} selectedSlotId={selectedSlot?.id} onSelectSlot={setSelectedSlot} />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Reservation details</Text>
        <Text style={styles.sectionCopy}>Choose an arrival window and confirm the plate that will enter the lot.</Text>

        <View style={styles.windowGroup}>
          {arrivalWindows.map((minutes) => {
            const selected = arrivalWindowMinutes === minutes;
            return (
              <Pressable key={minutes} onPress={() => setArrivalWindowMinutes(minutes)} style={[styles.windowChip, selected && styles.windowChipSelected]}>
                <Clock3 stroke={selected ? colors.primaryDark : colors.muted} size={16} />
                <Text style={[styles.windowLabel, selected && styles.windowLabelSelected]}>{minutes === 30 ? '30 min' : `${minutes / 60} hr`}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Plate number</Text>
          <TextInput
            value={normalizedPlateNumber}
            onChangeText={setPlateNumber}
            placeholder="ABC-1234"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
          />
        </View>

        {selectedSlot ? (
          <View style={styles.selectionSummary}>
            <Text style={styles.selectionTitle}>Selected slot</Text>
            <Text style={styles.selectionValue}>{selectedSlot.number}</Text>
          </View>
        ) : (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeCopy}>Pick an available slot on the map to continue.</Text>
          </View>
        )}

        <AppButton label="Confirm booking" onPress={handleConfirm} disabled={!selectedSlot || normalizedPlateNumber.length < 5} />
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '700',
  },
  sectionCopy: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  windowGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  windowChip: {
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  windowChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  windowLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  windowLabelSelected: {
    color: colors.primaryDark,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: typography.body,
  },
  selectionSummary: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  selectionTitle: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  selectionValue: {
    color: colors.primaryDark,
    fontSize: typography.section,
    fontWeight: '700',
  },
  noticeBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  noticeCopy: {
    color: colors.muted,
    fontSize: typography.body,
  },
});

