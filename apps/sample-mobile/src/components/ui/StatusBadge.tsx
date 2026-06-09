import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/tokens';

interface StatusBadgeProps {
  label: string;
  tone?: 'success' | 'info' | 'warning';
}

export function StatusBadge({ label, tone = 'success' }: StatusBadgeProps) {
  const palette = palettes[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}> 
      <Text style={[styles.label, { color: palette.textColor }]}>{label}</Text>
    </View>
  );
}

const palettes = {
  success: { backgroundColor: colors.primarySoft, textColor: colors.primaryDark },
  info: { backgroundColor: colors.infoSoft, textColor: colors.info },
  warning: { backgroundColor: colors.warningSoft, textColor: colors.warning },
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
