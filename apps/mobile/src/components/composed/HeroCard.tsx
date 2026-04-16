import React from 'react';
import { View, ViewProps } from 'react-native';
import { Card, Text } from '../ui';
import { spacing, colors } from '../../theme/tokens';

interface HeroCardProps extends ViewProps {
  step?: string;
  title: string;
  subtitle?: string;
  emoji?: string;
}

/**
 * HeroCard - Large prominent card at top of screen
 */
export const HeroCard = React.forwardRef<View, HeroCardProps>(
  (
    { 
      step, 
      title, 
      subtitle,
      emoji,
      children,
      ...props 
    },
    ref
  ) => {
    return (
      <Card ref={ref} variant="hero" {...props}>
        {step && (
          <Text variant="kicker" color="info">
            {step}
          </Text>
        )}
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
            {emoji && <Text style={{ fontSize: 24 }}>{emoji}</Text>}
            <View style={{ flex: 1 }}>
              <Text variant="hero">{title}</Text>
            </View>
          </View>
          {subtitle && <Text variant="body" color="secondary">{subtitle}</Text>}
        </View>
        {children}
      </Card>
    );
  }
);

HeroCard.displayName = 'HeroCard';
