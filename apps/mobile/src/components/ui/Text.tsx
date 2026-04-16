import React from 'react';
import { Text, TextProps } from 'react-native';
import { colors, typography } from '../theme/tokens';

type TextVariant = 
  | 'hero' 
  | 'heading1' 
  | 'heading2' 
  | 'title' 
  | 'body' 
  | 'bodySemibold' 
  | 'sm' 
  | 'smBold'
  | 'caption'
  | 'kicker';

type TextColor = keyof typeof colors.text | keyof typeof colors.status | keyof typeof colors.semantic;

interface CustomTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: 'light' | 'normal' | 'semibold' | 'bold' | '800';
}

const variantStyles: Record<TextVariant, any> = {
  hero: typography.hero,
  heading1: typography.heading1,
  heading2: typography.heading2,
  title: typography.title,
  body: typography.body,
  bodySemibold: typography.bodySemibold,
  sm: typography.sm,
  smBold: typography.smBold,
  caption: typography.caption,
  kicker: typography.kicker,
};

const colorMap: Record<TextColor, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  tertiary: colors.text.tertiary,
  inverse: colors.text.inverse,
  success: colors.status.success,
  warning: colors.status.warning,
  error: colors.status.error,
  info: colors.status.info,
  positiveText: colors.semantic.positiveText,
  warningText: colors.semantic.warningText,
  negativeText: colors.semantic.negativeText,
};

/**
 * Text component - Typography wrapper
 * 
 * @example
 * <Text variant="hero" color="primary">Title</Text>
 */
export const CustomText = React.forwardRef<Text, CustomTextProps>(
  (
    { 
      variant = 'body', 
      color = 'primary',
      weight,
      style,
      ...props 
    },
    ref
  ) => {
    const baseStyle = variantStyles[variant];
    const textColor = colorMap[color as TextColor];
    
    let fontWeight: any = baseStyle.fontWeight;
    if (weight) {
      fontWeight = weight === '800' ? '800' : weight;
    }
    
    const textStyle: any = {
      ...baseStyle,
      color: textColor,
      fontWeight,
    };
    
    return (
      <Text
        ref={ref}
        style={[textStyle, style]}
        {...props}
      />
    );
  }
);

CustomText.displayName = 'Text';
