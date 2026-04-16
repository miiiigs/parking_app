/**
 * App Constants
 */

// UI - Colors
export const COLORS = {
  primary: '#3dd6a5',
  secondary: '#7bd3ff',
  background: '#07111b',
  surface: '#08111d',
  surfaceLight: '#111c2d',
  text: '#f4f7fb',
  textSecondary: '#b8c7da',
  textTertiary: '#8b99b0',
  success: '#2fda88',
  warning: '#f5a623',
  error: '#f76b6b',
  info: '#7bd3ff',
  border: '#18283f',
  borderSubtle: '#1a2e49',
};

// UI - Spacing
export const SPACING = {
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

// UI - Border Radius
export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  full: 999,
};

// Maps
export const MAP_DEFAULT_ZOOM = 0.0922;
export const MAP_SEARCH_RADIUS_KM = 5;
export const MAP_CLUSTER_RADIUS = 50;

// Booking
export const BOOKING_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const ARRIVAL_WINDOW_OPTIONS = [
  { label: 'ASAP', value: 0 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

// Time intervals
export const REFRESH_INTERVALS = {
  NEARBY_PARKING: 30000, // 30 seconds
  AVAILABILITY: 60000, // 1 minute
  BOOKING_STATUS: 10000, // 10 seconds
  GPS_UPDATE: 5000, // 5 seconds
} as const;

// Location
export const MANILA_CENTER = {
  latitude: 14.5994,
  longitude: 120.9842,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export const CEBU_CENTER = {
  latitude: 10.3157,
  longitude: 123.8854,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// API
export const API_TIMEOUT = 10000; // 10 seconds
export const API_RETRY_ATTEMPTS = 3;
export const API_RETRY_DELAY = 1000; // 1 second
