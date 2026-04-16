/**
 * Global Zustand Stores
 * Centralized state management
 */

export { useAuthStore, type User } from './authStore';
export { useMapStore, type Location, type ParkingSpot } from './mapStore';
export { useParkingStore, type Booking } from './parkingStore';
export { useAppStore } from './appStore';
