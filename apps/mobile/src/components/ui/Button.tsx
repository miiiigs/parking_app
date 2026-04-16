import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: string;
  isLoading?: boolean;
  disabled?: boolean;
}

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.brand.primary,
  },
  secondary: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.light,
    borderWidth: 1,
  },
  tertiary: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.status.error,
  },
};

const sizeStyles: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number; fontWeight: string }> = {
  sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    fontWeight: '600',
  },
  md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    fontWeight: '700',
  },
  lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    fontSize: 16,
    fontWeight: '800',
  },
};

const textColorByVariant: Record<ButtonVariant, string> = {
  primary: colors.text.inverse,
  secondary: colors.text.primary,
  tertiary: colors.text.primary,
  danger: colors.text.inverse,
};

/**
 * Button component - Clickable action element
 * 
 * @example
 * <Button variant="primary" size="lg" onPress={handlePress}>
 *   Book Now
 * </Button>
 */
export const Button = React.forwardRef<TouchableOpacity, ButtonProps>(
  (
    { 
      variant = 'primary', 
      size = 'md', 
      children, 
      isLoading = false,
      disabled = false,
      style,
      onPress,
      ...props 
    }, 
    ref
  ) => {
    const sizeStyle = sizeStyles[size];
    const isDisabled = disabled || isLoading;
    
    const buttonStyle: ViewStyle = {
      ...variantStyles[variant],
      paddingVertical: sizeStyle.paddingVertical,
      paddingHorizontal: sizeStyle.paddingHorizontal,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isDisabled ? 0.6 : 1,
      minHeight: size === 'lg' ? 48 : size === 'md' ? 44 : 36,
    };
    
    return (
      <TouchableOpacity
        ref={ref}
        style={[buttonStyle, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        accessible
        accessibilityRole="button"
        accessibilityLabel={children}
        {...props}
      >
        <Text
          style={{
            color: textColorByVariant[variant],
            fontSize: sizeStyle.fontSize,
            fontWeight: sizeStyle.fontWeight as any,
          }}
        >
          {isLoading ? 'Loading...' : children}
        </Text>
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';
