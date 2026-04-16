import React from 'react';
import { View, ViewProps } from 'react-native';
import { Text } from '../ui';
import { spacing, colors } from '../../theme/tokens';

interface DetailRowProps extends ViewProps {
  label: string;
  value: string;
  divider?: boolean;
}

/**
 * DetailRow - Row with label and value
 */
export const DetailRow = React.forwardRef<View, DetailRowProps>(
  (
    { 
      label, 
      value,
      divider = false,
      style,
      ...props 
    },
    ref
  ) => {
    return (
      <View ref={ref} style={{ gap: spacing.sm }}>
        <View
          style={[
            {
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: spacing.md,
            },
            style,
          ]}
          {...props}
        >
          <Text variant="body" color="secondary">
            {label}
          </Text>
          <Text variant="bodySemibold">
            {value}
          </Text>
        </View>
        {divider && (
          <View style={{
            height: 1,
            backgroundColor: colors.border.subtle,
          }} />
        )}
      </View>
    );
  }
);

DetailRow.displayName = 'DetailRow';
