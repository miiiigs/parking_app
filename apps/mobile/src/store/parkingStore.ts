import { create } from 'zustand';

export interface Booking {
  id: string;
  parking_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'completed' | 'cancelled';
  price: number;
  vehicle_plate: string;
}

interface ParkingState {
  currentBooking: Booking | null;
  bookingHistory: Booking[];
  filters: {
    sortBy: 'distance' | 'price' | 'rating';
    minAvailable: number;
    maxPrice: number;
  };
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentBooking: (booking: Booking | null) => void;
  setBookingHistory: (bookings: Booking[]) => void;
  setFilters: (filters: Partial<ParkingState['filters']>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useParkingStore = create<ParkingState>((set) => ({
  currentBooking: null,
  bookingHistory: [],
  filters: {
    sortBy: 'distance',
    minAvailable: 1,
    maxPrice: 500,
  },
  loading: false,
  error: null,

  setCurrentBooking: (booking) => set({ currentBooking: booking }),
  setBookingHistory: (bookings) => set({ bookingHistory: bookings }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  reset: () =>
    set({
      currentBooking: null,
      filters: {
        sortBy: 'distance',
        minAvailable: 1,
        maxPrice: 500,
      },
      error: null,
    }),
}));
