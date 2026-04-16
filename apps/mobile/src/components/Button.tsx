import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  label: string;
  onPress: () => void;
}

const variantStyles = {
  primary: {
    bg: COLORS.primary,
    text: COLORS.background,
  },
  secondary: {
    bg: COLORS.surface,
    text: COLORS.primary,
  },
  danger: {
    bg: COLORS.error,
    text: '#fff',
  },
  ghost: {
    bg: 'transparent',
    text: COLORS.primary,
  },
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    height: 36,
    paddingHorizontal: SPACING.md,
  },
  md: {
    height: 44,
    paddingHorizontal: SPACING.lg,
  },
  lg: {
    height: 48,
    paddingHorizontal: SPACING.xl,
  },
};

export const Button = React.forwardRef<TouchableOpacity, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      label,
      onPress,
      style,
      ...props
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.button,
          sizeStyle,
          {
            backgroundColor: variantStyle.bg,
            borderColor: variant === 'ghost' ? variantStyle.text : 'transparent',
            borderWidth: variant === 'ghost' ? 1 : 0,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={variantStyle.text} />
        ) : (
          <Text
            style={[
              styles.text,
              { color: variantStyle.text, fontWeight: '600' },
            ]}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
