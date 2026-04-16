import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';

interface InputProps extends TextInputProps {
  error?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ error, style, ...props }, ref) => {
    return (
      <View>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              borderColor: error ? COLORS.error : COLORS.border,
              borderWidth: 1,
            },
            style,
          ]}
          placeholderTextColor={COLORS.textTertiary}
          {...props}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';

// Import Text for error display
import { Text } from 'react-native';

const styles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: 14,
    fontWeight: '500',
    minHeight: 44,
  },
  error: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
});
