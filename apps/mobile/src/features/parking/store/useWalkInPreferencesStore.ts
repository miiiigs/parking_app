import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureStorage } from '../lib/storage';

export type WalkInVehicle = {
  id: string;
  model: string;
  color: string;
  plate: string;
  isDefault?: boolean;
};

type WalkInPreferencesState = {
  paymentMethod: string | null;
  vehicles: WalkInVehicle[];
  selectedVehicleId: string | null;
  vehicle: WalkInVehicle | null;
  setPaymentMethod: (value: string | null) => void;
  setVehicle: (value: Omit<WalkInVehicle, 'id'> & { id?: string }) => void;
  setVehicles: (vehicles: WalkInVehicle[], selectedVehicleId?: string | null) => void;
  selectVehicle: (vehicleId: string | null) => void;
  removeVehicle: (vehicleId: string) => void;
};

function createLocalVehicleId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSelection(vehicles: WalkInVehicle[], selectedVehicleId?: string | null) {
  if (!vehicles.length) {
    return {
      selectedVehicleId: null,
      vehicle: null,
    };
  }

  const selectedVehicle =
    (selectedVehicleId ? vehicles.find((entry) => entry.id === selectedVehicleId) : null)
    ?? vehicles.find((entry) => entry.isDefault)
    ?? vehicles[0]
    ?? null;

  return {
    selectedVehicleId: selectedVehicle?.id ?? null,
    vehicle: selectedVehicle,
  };
}

export const useWalkInPreferencesStore = create<WalkInPreferencesState>()(
  persist(
    (set) => ({
      paymentMethod: null,
      vehicles: [],
      selectedVehicleId: null,
      vehicle: null,
      setPaymentMethod: (value) => set({ paymentMethod: value }),
      setVehicle: (value) =>
        set((state) => {
          const nextVehicle: WalkInVehicle = {
            ...value,
            id: value.id ?? state.vehicle?.id ?? createLocalVehicleId(),
          };
          const existingIndex = state.vehicles.findIndex((entry) => entry.id === nextVehicle.id);
          const nextVehicles =
            existingIndex >= 0
              ? state.vehicles.map((entry, index) => (index === existingIndex ? nextVehicle : entry))
              : [...state.vehicles, nextVehicle];

          return {
            vehicles: nextVehicles,
            selectedVehicleId: nextVehicle.id,
            vehicle: nextVehicle,
          };
        }),
      setVehicles: (vehicles, selectedVehicleId = null) =>
        set(() => ({
          vehicles,
          ...normalizeSelection(vehicles, selectedVehicleId),
        })),
      selectVehicle: (vehicleId) =>
        set((state) => ({
          ...normalizeSelection(state.vehicles, vehicleId),
        })),
      removeVehicle: (vehicleId) =>
        set((state) => {
          const nextVehicles = state.vehicles.filter((entry) => entry.id !== vehicleId);
          return {
            vehicles: nextVehicles,
            ...normalizeSelection(nextVehicles, state.selectedVehicleId === vehicleId ? null : state.selectedVehicleId),
          };
        }),
    }),
    {
      name: '@parking/mobile-walkin-preferences',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        paymentMethod: state.paymentMethod,
        vehicles: state.vehicles,
        selectedVehicleId: state.selectedVehicleId,
        vehicle: state.vehicle,
      }),
    },
  ),
);
