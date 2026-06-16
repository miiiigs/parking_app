import { Platform } from 'react-native';

export const colors = {
  canvas: '#F3F7F2',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF5F0',
  text: '#112016',
  muted: '#5E7465',
  border: '#D9E4DC',
  primary: '#1D8B67',
  primaryDark: '#15684D',
  primarySoft: '#DDF4EA',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#C24141',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radius = {
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const typography = {
  eyebrow: 12,
  caption: 13,
  body: 16,
  section: 18,
  title: 24,
  hero: 36,
};

export const shadows = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  android: {
    elevation: 3,
  },
  default: {},
});
