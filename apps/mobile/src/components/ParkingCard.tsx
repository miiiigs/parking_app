import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewProps } from 'react-native';
import { MapPin, Star, Navigation2 } from 'lucide-react-native';
import { COLORS, SPACING } from '@/constants';
import { ParkingSpot } from '@/store';

interface ParkingCardProps extends ViewProps {
  parking: ParkingSpot;
  onPress?: () => void;
}

export const ParkingCard = React.forwardRef<View, ParkingCardProps>(
  ({ parking, onPress, style, ...props }, ref) => {
    const occupancyRate =
      ((parking.total_slots - parking.available_slots) /
        parking.total_slots) *
      100;

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onPress}
        style={[styles.card, style]}
        activeOpacity={0.7}
        {...props}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{parking.name}</Text>
            <View style={styles.location}>
              <MapPin size={14} color={COLORS.textTertiary} />
              <Text style={styles.distance}>
                {parking.distance?.toFixed(1) || '0'} km away
              </Text>
            </View>
          </View>
          {parking.rating && (
            <View style={styles.rating}>
              <Star size={16} color={COLORS.warning} fill={COLORS.warning} />
              <Text style={styles.ratingText}>{parking.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Availability */}
        <View style={styles.availability}>
          <View style={styles.availabilityItem}>
            <Text style={styles.availabilityLabel}>Available</Text>
            <Text style={styles.availabilityValue}>
              {parking.available_slots}/{parking.total_slots}
            </Text>
          </View>
          <View
            style={[
              styles.occupancyBar,
              {
                width: `${Math.max(occupancyRate, 5)}%`,
                backgroundColor:
                  occupancyRate < 50
                    ? COLORS.success
                    : occupancyRate < 80
                      ? COLORS.warning
                      : COLORS.error,
              },
            ]}
          />
        </View>

        {/* Price */}
        <Text style={styles.price}>
          ₱{parking.price_per_hour.toFixed(2)}/hr
        </Text>
      </TouchableOpacity>
    );
  }
);

ParkingCard.displayName = 'ParkingCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  distance: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  availability: {
    marginBottom: SPACING.md,
  },
  availabilityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  availabilityLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  availabilityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  occupancyBar: {
    height: 4,
    backgroundColor: COLORS.success,
    borderRadius: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
