import apiClient from './api';
import { Booking } from '@/store';

/**
 * Booking Service - Reservation and booking management
 */

export const bookingService = {
  /**
   * Create new booking
   */
  createBooking: (data: {
    parking_id: string;
    start_time: string;
    end_time: string;
    vehicle_plate: string;
  }) => apiClient.post<Booking>('/bookings', data),

  /**
   * Get booking details
   */
  getBooking: (bookingId: string) =>
    apiClient.get<Booking>(`/bookings/${bookingId}`),

  /**
   * Get user's booking history
   */
  getBookingHistory: (limit: number = 20, offset: number = 0) =>
    apiClient.get<Booking[]>('/bookings/history', {
      params: { limit, offset },
    }),

  /**
   * Cancel booking
   */
  cancelBooking: (bookingId: string) =>
    apiClient.post<Booking>(`/bookings/${bookingId}/cancel`),

  /**
   * Complete booking
   */
  completeBooking: (bookingId: string) =>
    apiClient.post<Booking>(`/bookings/${bookingId}/complete`),

  /**
   * Get active bookings
   */
  getActiveBookings: () =>
    apiClient.get<Booking[]>('/bookings/active'),
};

export default bookingService;
