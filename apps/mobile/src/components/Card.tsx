import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';

type CardVariant = 'default' | 'elevated' | 'outlined';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  children: React.ReactNode;
}

const variantStyles = {
  default: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  elevated: {
    backgroundColor: COLORS.surface,
    borderColor: 'transparent',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  outlined: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
};

export const Card = React.forwardRef<View, CardProps>(
  ({ variant = 'default', children, style, ...props }, ref) => {
    const variantStyle = variantStyles[variant];

    return (
      <View
        ref={ref}
        style={[styles.card, variantStyle, style]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

Card.displayName = 'Card';

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
});
