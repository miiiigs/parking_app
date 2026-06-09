import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme/tokens';

interface DetailRowProps {
  label: string;
  value: string;
  icon?: ReactNode;
}

export function DetailRow({ label, value, icon }: DetailRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.labelGroup}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  label: {
    color: colors.muted,
    fontSize: typography.body,
    flexShrink: 1,
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
    flexShrink: 0,
  },
});
