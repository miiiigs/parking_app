import { Platform } from 'react-native';

export const colors = {
  canvas: '#F6F3ED',
  canvasMuted: '#FBF9F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F3EEE6',
  surfaceRaised: '#FCFAF7',
  text: '#171A1F',
  muted: '#606875',
  mutedSoft: '#8A93A2',
  border: '#E6E0D7',
  borderStrong: '#D8D0C4',
  primary: '#0F5F52',
  primaryDark: '#0A4339',
  primarySoft: '#E3F0EB',
  accent: '#A57A4A',
  accentSoft: '#F4EBDD',
  warning: '#B45309',
  warningSoft: '#FCF1DF',
  danger: '#B64141',
  dangerSoft: '#F8E5E3',
  info: '#3B5E8C',
  infoSoft: '#E6EDF7',
  overlay: 'rgba(20, 24, 32, 0.08)',
  shadow: '#10131A',
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  eyebrow: 11,
  caption: 13,
  body: 16,
  section: 18,
  title: 24,
  hero: 34,
  display: 40,
};

export const shadows = Platform.select({
  ios: {
    shadowColor: '#10131A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  android: {
    elevation: 2,
  },
  default: {},
});

export const motion = {
  quick: 180,
  standard: 260,
  calm: 360,
};
