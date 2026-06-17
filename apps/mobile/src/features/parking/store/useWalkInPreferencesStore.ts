import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureStorage } from '../lib/storage';

type WalkInVehicle = {
  model: string;
  color: string;
  plate: string;
};

type WalkInPreferencesState = {
  paymentMethod: string | null;
  vehicle: WalkInVehicle | null;
  setPaymentMethod: (value: string | null) => void;
  setVehicle: (value: WalkInVehicle) => void;
};

export const useWalkInPreferencesStore = create<WalkInPreferencesState>()(
  persist(
    (set) => ({
      paymentMethod: null,
      vehicle: null,
      setPaymentMethod: (value) => set({ paymentMethod: value }),
      setVehicle: (value) => set({ vehicle: value }),
    }),
    {
      name: '@parking/mobile-walkin-preferences',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        paymentMethod: state.paymentMethod,
        vehicle: state.vehicle,
      }),
    },
  ),
);
