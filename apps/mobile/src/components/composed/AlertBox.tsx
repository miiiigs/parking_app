import React from 'react';
import { View, ViewProps } from 'react-native';
import { Text } from '../ui';
import { spacing, colors } from '../../theme/tokens';

interface AlertBoxProps extends ViewProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

/**
 * AlertBox - Status/alert message box
 */
export const AlertBox = React.forwardRef<View, AlertBoxProps>(
  (
    { 
      type, 
      title, 
      message,
      style,
      ...props 
    },
    ref
  ) => {
    const getStyles = () => {
      switch (type) {
        case 'success':
          return {
            bg: colors.semantic.positive,
            border: '#2d7f63',
            titleColor: colors.semantic.positiveText,
            messageColor: '#c6f2e4',
          };
        case 'error':
          return {
            bg: colors.semantic.negative,
            border: '#8f3c46',
            titleColor: colors.semantic.negativeText,
            messageColor: '#f2c9cd',
          };
        case 'warning':
          return {
            bg: colors.semantic.warning,
            border: '#8a6b2f',
            titleColor: colors.semantic.warningText,
            messageColor: '#f5e6bf',
          };
        default:
          return {
            bg: colors.background.surface,
            border: colors.border.default,
            titleColor: colors.text.primary,
            messageColor: colors.text.secondary,
          };
      }
    };
    
    const styles = getStyles();
    
    return (
      <View
        ref={ref}
        style={[
          {
            backgroundColor: styles.bg,
            borderColor: styles.border,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            gap: spacing.xs,
          },
          style,
        ]}
        {...props}
      >
        <Text variant="smBold" color={styles.titleColor as any}>
          {title}
        </Text>
        {message && (
          <Text variant="sm" color={styles.messageColor as any}>
            {message}
          </Text>
        )}
      </View>
    );
  }
);

AlertBox.displayName = 'AlertBox';
