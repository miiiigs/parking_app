import React from 'react';
import { View, ViewProps } from 'react-native';
import { CustomText } from './Text';
import { colors, borderRadius, spacing } from '../theme/tokens';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  label: string;
  emoji?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; border: string; text: string }> = {
  primary: {
    bg: colors.background.surface,
    border: colors.border.default,
    text: colors.text.primary,
  },
  success: {
    bg: colors.semantic.positive,
    border: '#2d7f63',
    text: colors.semantic.positiveText,
  },
  warning: {
    bg: colors.semantic.warning,
    border: '#8a6b2f',
    text: colors.semantic.warningText,
  },
  error: {
    bg: colors.semantic.negative,
    border: '#8f3c46',
    text: colors.semantic.negativeText,
  },
  info: {
    bg: colors.background.surface,
    border: colors.border.default,
    text: colors.brand.secondary,
  },
  neutral: {
    bg: colors.background.tertiary,
    border: colors.border.subtle,
    text: colors.text.secondary,
  },
};

/**
 * Badge component - Small label element
 * 
 * @example
 * <Badge variant="success" label="Available" />
 */
export const Badge = React.forwardRef<View, BadgeProps>(
  (
    { 
      variant = 'neutral',
      label,
      emoji,
      style,
      ...props 
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant];
    
    return (
      <View
        ref={ref}
        style={[
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: variantStyle.bg,
            borderWidth: 1,
            borderColor: variantStyle.border,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.xs,
          },
          style,
        ]}
        {...props}
      >
        {emoji && <CustomText>{emoji}</CustomText>}
        <CustomText variant="smBold" color={variantStyle.text as any}>
          {label}
        </CustomText>
      </View>
    );
  }
);

Badge.displayName = 'Badge';
