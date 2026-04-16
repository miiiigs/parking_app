import React from 'react';
import { View, ViewProps } from 'react-native';
import { colors, borderRadius, spacing } from '../theme/tokens';

type CardVariant = 'default' | 'hero' | 'spotlight' | 'compact';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  gap?: number;
}

const variantStyles: Record<CardVariant, any> = {
  default: {
    backgroundColor: colors.background.surface,
    borderColor: colors.border.default,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
  },
  hero: {
    backgroundColor: colors.background.surfaceLight,
    borderColor: colors.border.default,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius['2xl'],
    gap: spacing.md,
  },
  spotlight: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.subtle,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
    borderRadius: borderRadius['2xl'],
    gap: spacing.lg,
  },
  compact: {
    backgroundColor: colors.background.surface,
    borderColor: colors.border.default,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
};

/**
 * Card component - Base container for content
 * 
 * @example
 * <Card variant="hero">
 *   <Text>Card content</Text>
 * </Card>
 */
export const Card = React.forwardRef<View, CardProps>(
  ({ variant = 'default', gap, style, ...props }, ref) => {
    const baseStyle = variantStyles[variant];
    const customGap = gap !== undefined ? { gap } : {};
    
    return (
      <View
        ref={ref}
        style={[baseStyle, customGap, style]}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
