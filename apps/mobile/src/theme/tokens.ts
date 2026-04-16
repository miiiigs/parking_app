/**
 * Design System Tokens
 * Centralized theme configuration for entire application
 * Used with NativeWind and component library
 */

export const colors = {
  // Core brand colors
  brand: {
    primary: '#3dd6a5',      // Accent green
    secondary: '#7bd3ff',    // Accent cyan
  },
  
  // Background palette
  background: {
    primary: '#07111b',      // Darkest - main bg
    secondary: '#0b1320',    // Slightly lighter
    tertiary: '#0f1b2c',     // Medium dark
    surface: '#08111d',      // Card background
    surfaceLight: '#111c2d', // Light card (hero)
  },
  
  // Text palette
  text: {
    primary: '#f4f7fb',      // Main text
    secondary: '#b8c7da',    // Muted text
    tertiary: '#7f94ad',     // Very muted
    inverse: '#071018',      // Inverse (on bright bg)
  },
  
  // Status colors
  status: {
    success: '#3dd6a5',      // Green
    warning: '#ffcf66',      // Amber
    error: '#ff8a80',        // Red
    info: '#7bd3ff',         // Cyan
  },
  
  // Semantic colors
  semantic: {
    positive: '#0e231a',     // Success background
    positiveText: '#3dd6a5', // Success text
    warning: '#2a220f',      // Warning background
    warningText: '#ffcf66',  // Warning text
    negative: '#2a1114',     // Error background
    negativeText: '#ff8a80', // Error text
  },
  
  // Border/divider
  border: {
    default: '#18283f',      // Default border
    subtle: '#1a2e49',       // Subtle border
    light: '#26405f',        // Light border
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  full: 999,
};

export const typography = {
  // Hero/Display heading
  hero: {
    fontSize: 26,
    fontWeight: '800' as const,
    lineHeight: 32,
  },
  
  // Large heading
  heading1: {
    fontSize: 24,
    fontWeight: '800' as const,
    lineHeight: 30,
  },
  
  // Heading
  heading2: {
    fontSize: 20,
    fontWeight: '800' as const,
    lineHeight: 28,
  },
  
  // Subtitle/Title
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 22,
  },
  
  // Body - regular
  body: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  
  // Body - emphasis
  bodySemibold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  
  // Small text
  sm: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  
  // Small text - emphasis
  smBold: {
    fontSize: 12,
    fontWeight: '700' as const,
    lineHeight: 16,
  },
  
  // Label/Caption
  caption: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
  
  // Kicker/Label
  kicker: {
    fontSize: 12,
    fontWeight: '800' as const,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};

export type Theme = typeof theme;
