import apiClient from './api';
import { ParkingSpot, Location } from '@/store';

/**
 * Parking Service - All parking-related API calls
 */

export const parkingService = {
  /**
   * Get nearby parking spots
   */
  getNearbyParking: (location: Location, radiusKm: number = 5) =>
    apiClient.get<ParkingSpot[]>('/parking/nearby', {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        radius: radiusKm,
      },
    }),

  /**
   * Get single parking details
   */
  getParkingDetails: (parkingId: string) =>
    apiClient.get<ParkingSpot>(`/parking/${parkingId}`),

  /**
   * Search parking with filters
   */
  searchParking: (filters: {
    location: Location;
    minAvailable?: number;
    maxPrice?: number;
    sortBy?: 'distance' | 'price' | 'rating';
  }) =>
    apiClient.post<ParkingSpot[]>('/parking/search', filters),

  /**
   * Get parking availability
   */
  getAvailability: (parkingId: string) =>
    apiClient.get<{
      available_slots: number;
      total_slots: number;
      occupancy_rate: number;
    }>(`/parking/${parkingId}/availability`),
};

export default parkingService;
