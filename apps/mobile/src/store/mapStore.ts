import { create } from 'zustand';

export interface Location {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

export interface ParkingSpot {
  id: string;
  name: string;
  location: Location;
  available_slots: number;
  total_slots: number;
  price_per_hour: number;
  rating?: number;
  distance?: number;
  features?: string[];
}

interface MapState {
  userLocation: Location | null;
  selectedParking: ParkingSpot | null;
  nearbyParking: ParkingSpot[];
  mapZoom: number;
  loading: boolean;
  error: string | null;

  // Actions
  setUserLocation: (location: Location) => void;
  setSelectedParking: (parking: ParkingSpot | null) => void;
  setNearbyParking: (parking: ParkingSpot[]) => void;
  setMapZoom: (zoom: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  userLocation: null,
  selectedParking: null,
  nearbyParking: [],
  mapZoom: 0.0922,
  loading: false,
  error: null,

  setUserLocation: (location) => set({ userLocation: location }),
  setSelectedParking: (parking) => set({ selectedParking: parking }),
  setNearbyParking: (parking) => set({ nearbyParking: parking }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  reset: () =>
    set({
      userLocation: null,
      selectedParking: null,
      nearbyParking: [],
      mapZoom: 0.0922,
      error: null,
    }),
}));
