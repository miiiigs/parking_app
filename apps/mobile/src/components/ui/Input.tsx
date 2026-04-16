import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { CustomText } from './Text';
import { colors, spacing, borderRadius } from '../theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
}

/**
 * Input component - Text input field
 * 
 * @example
 * <Input
 *   label="Plate Number"
 *   placeholder="ABC-1234"
 *   value={plate}
 *   onChangeText={setPlate}
 * />
 */
export const Input = React.forwardRef<TextInput, InputProps>(
  (
    { 
      label, 
      error, 
      helper,
      style,
      ...props 
    },
    ref
  ) => {
    return (
      <View style={{ gap: spacing.sm }}>
        {label && (
          <CustomText variant="kicker" color="info">
            {label}
          </CustomText>
        )}
        
        <TextInput
          ref={ref}
          style={[
            {
              backgroundColor: colors.background.surface,
              borderWidth: 1,
              borderColor: error ? colors.status.error : colors.border.default,
              borderRadius: borderRadius.lg,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              fontSize: 14,
              fontWeight: '600',
              color: colors.text.primary,
              minHeight: 44,
            },
            style,
          ]}
          placeholderTextColor={colors.text.tertiary}
          {...props}
        />
        
        {error && (
          <CustomText variant="sm" color="error">
            {error}
          </CustomText>
        )}
        
        {helper && !error && (
          <CustomText variant="sm" color="secondary">
            {helper}
          </CustomText>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
