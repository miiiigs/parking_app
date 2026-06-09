import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import type { ParkingSlot } from '../../features/parking/types';
import { colors, radius, spacing, typography } from '../../theme/tokens';

interface ParkingMapProps {
  slots: ParkingSlot[];
  selectedSlotId?: string;
  onSelectSlot: (slot: ParkingSlot) => void;
}

export function ParkingMap({ slots, selectedSlotId, onSelectSlot }: ParkingMapProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.canvas}>
        <Svg width="100%" height="100%" viewBox="0 0 280 200">
          <Rect x="0" y="90" width="280" height="20" fill="#CAD7CF" />
          <Line x1="0" y1="100" x2="280" y2="100" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="10,10" />
          {slots.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            const fill = isSelected ? colors.primary : slot.isAvailable ? colors.surfaceMuted : '#D1D5DB';
            const stroke = isSelected ? colors.primaryDark : '#9AA7A0';
            const labelColor = isSelected ? colors.surface : slot.isAvailable ? colors.text : '#8A8F98';

            return (
              <G key={slot.id} onPress={() => slot.isAvailable && onSelectSlot(slot)}>
                <Rect x={slot.x} y={slot.y} width="50" height="40" rx="6" fill={fill} stroke={stroke} strokeWidth="2" />
                <SvgText x={slot.x + 25} y={slot.y + 24} fontSize="12" fontWeight="700" fill={labelColor} textAnchor="middle">
                  {slot.number}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      <View style={styles.legendRow}>
        <Legend label="Available" fill={colors.surfaceMuted} stroke="#9AA7A0" />
        <Legend label="Occupied" fill="#D1D5DB" stroke="#9AA7A0" />
        <Legend label="Selected" fill={colors.primary} stroke={colors.primaryDark} />
      </View>
    </View>
  );
}

function Legend({ label, fill, stroke }: { label: string; fill: string; stroke: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: fill, borderColor: stroke }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  canvas: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatch: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderRadius: 4,
  },
  legendText: {
    color: colors.muted,
    fontSize: typography.caption,
  },
});
