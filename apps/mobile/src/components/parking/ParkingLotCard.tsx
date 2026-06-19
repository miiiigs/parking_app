import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Clock3, DollarSign, MapPin } from 'lucide-react-native';
import { formatParkingPricingSummary } from '@parking/shared';

import type { ParkingLot } from '../../features/parking/types';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { formatDistance } from '../../utils/format';
import { SurfaceCard } from '../ui/SurfaceCard';

interface ParkingLotCardProps {
  lot: ParkingLot;
  onPress: () => void;
}

export function ParkingLotCard({ lot, onPress }: ParkingLotCardProps) {
  const occupancy = Math.round((lot.availableSlots / lot.totalSlots) * 100);
  const pricingSummary = formatParkingPricingSummary(lot.pricingConfig);

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <SurfaceCard style={[styles.card, pressed && styles.pressed]}>
          <View style={styles.topRow}>
            <View style={styles.copyBlock}>
              <Text style={styles.title}>{lot.name}</Text>
              <View style={styles.addressRow}>
                <MapPin stroke={colors.muted} size={14} />
                <Text style={styles.address}>{lot.address}</Text>
              </View>
            </View>
            <ChevronRight stroke={colors.muted} size={18} />
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Clock3 stroke={colors.muted} size={14} />
              <Text style={styles.metricText}>{formatDistance(lot.distanceKm)}</Text>
            </View>
            <View style={styles.metricItem}>
              <DollarSign stroke={colors.muted} size={14} />
              <Text style={styles.metricText}>{pricingSummary}</Text>
            </View>
          </View>

          <View style={styles.featuresRow}>
            {lot.features.map((feature) => (
              <View key={feature} style={styles.featureChip}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.occupancySection}>
            <View style={styles.occupancyHeader}>
              <Text style={styles.occupancyCopy}>{lot.availableSlots} of {lot.totalSlots} available</Text>
              <Text style={styles.occupancyPercent}>{occupancy}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${occupancy}%` }]} />
            </View>
          </View>
        </SurfaceCard>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.94,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copyBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '700',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  address: {
    color: colors.muted,
    fontSize: typography.body,
    flex: 1,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '500',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  featureText: {
    color: colors.muted,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  occupancySection: {
    gap: spacing.xs,
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  occupancyCopy: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  occupancyPercent: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});

