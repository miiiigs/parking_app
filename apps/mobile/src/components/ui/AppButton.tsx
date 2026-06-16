import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

export function AppButton({ label, onPress, variant = 'primary', disabled = false, loading = false }: AppButtonProps) {
  const palette = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <View style={styles.labelRow}>
        {loading ? <ActivityIndicator color={palette.textColor} /> : null}
        <Text style={[styles.label, { color: palette.textColor }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const variantStyles = {
  primary: { backgroundColor: colors.primary, borderColor: colors.primary, textColor: colors.surface },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, textColor: colors.text },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger, textColor: colors.surface },
};

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.92,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
  },
});

