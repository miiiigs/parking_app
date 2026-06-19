import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useMobileAuth } from './MobileAuthProvider';
import { deleteUserVehicle, listUserVehicles, saveUserVehicle } from '../lib/userVehicles';
import { useWalkInPreferencesStore, type WalkInVehicle } from '../features/parking/store/useWalkInPreferencesStore';

type SaveVehicleInput = {
  id?: string;
  model: string;
  color: string;
  plate: string;
  isDefault?: boolean;
};

type MobileVehicleContextValue = {
  vehicles: WalkInVehicle[];
  selectedVehicle: WalkInVehicle | null;
  selectedVehicleId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshVehicles: () => Promise<void>;
  saveVehicle: (input: SaveVehicleInput) => Promise<WalkInVehicle>;
  selectVehicle: (vehicleId: string | null) => Promise<void>;
  removeVehicle: (vehicleId: string) => Promise<void>;
  clearError: () => void;
};

const MobileVehicleContext = createContext<MobileVehicleContextValue | null>(null);

export function MobileVehicleProvider({ children }: { children: React.ReactNode }) {
  const auth = useMobileAuth();
  const vehicles = useWalkInPreferencesStore((state) => state.vehicles);
  const selectedVehicle = useWalkInPreferencesStore((state) => state.vehicle);
  const selectedVehicleId = useWalkInPreferencesStore((state) => state.selectedVehicleId);
  const setVehicles = useWalkInPreferencesStore((state) => state.setVehicles);
  const setVehicle = useWalkInPreferencesStore((state) => state.setVehicle);
  const selectLocalVehicle = useWalkInPreferencesStore((state) => state.selectVehicle);
  const removeLocalVehicle = useWalkInPreferencesStore((state) => state.removeVehicle);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshVehicles = React.useCallback(async () => {
    if (!auth.user || auth.isGuest) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const remoteVehicles = await listUserVehicles();
      const nextSelectedVehicleId =
        (selectedVehicleId && remoteVehicles.some((entry) => entry.id === selectedVehicleId) ? selectedVehicleId : null)
        ?? remoteVehicles.find((entry) => entry.isDefault)?.id
        ?? remoteVehicles[0]?.id
        ?? null;

      setVehicles(remoteVehicles, nextSelectedVehicleId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load your saved vehicles.');
    } finally {
      setIsLoading(false);
    }
  }, [auth.isGuest, auth.user, selectedVehicleId, setVehicles]);

  useEffect(() => {
    void refreshVehicles();
  }, [refreshVehicles]);

  const saveVehicleValue = React.useCallback(
    async (input: SaveVehicleInput) => {
      setError(null);

      if (!auth.user || auth.isGuest) {
        const nextVehicle: WalkInVehicle = {
          id: input.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          model: input.model.trim(),
          color: input.color.trim(),
          plate: input.plate.toUpperCase().replace(/[^A-Z0-9 -]/g, '').trim(),
          isDefault: true,
        };
        setVehicle(nextVehicle);
        return nextVehicle;
      }

      setIsLoading(true);

      try {
        const savedVehicle = await saveUserVehicle(input);
        const remoteVehicles = await listUserVehicles();
        setVehicles(remoteVehicles, savedVehicle.id);
        return savedVehicle;
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : 'Unable to save your vehicle.';
        setError(message);
        throw nextError;
      } finally {
        setIsLoading(false);
      }
    },
    [auth.isGuest, auth.user, setVehicle, setVehicles],
  );

  const selectVehicleValue = React.useCallback(
    async (vehicleId: string | null) => {
      setError(null);
      selectLocalVehicle(vehicleId);
    },
    [selectLocalVehicle],
  );

  const removeVehicleValue = React.useCallback(
    async (vehicleId: string) => {
      setError(null);

      if (!auth.user || auth.isGuest) {
        removeLocalVehicle(vehicleId);
        return;
      }

      setIsLoading(true);

      try {
        await deleteUserVehicle(vehicleId);
        const remoteVehicles = await listUserVehicles();
        setVehicles(remoteVehicles, selectedVehicleId === vehicleId ? null : selectedVehicleId);
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : 'Unable to remove that vehicle.';
        setError(message);
        throw nextError;
      } finally {
        setIsLoading(false);
      }
    },
    [auth.isGuest, auth.user, removeLocalVehicle, selectedVehicleId, setVehicles],
  );

  const value = useMemo<MobileVehicleContextValue>(
    () => ({
      vehicles,
      selectedVehicle,
      selectedVehicleId,
      isLoading,
      error,
      refreshVehicles,
      saveVehicle: saveVehicleValue,
      selectVehicle: selectVehicleValue,
      removeVehicle: removeVehicleValue,
      clearError: () => setError(null),
    }),
    [error, isLoading, refreshVehicles, removeVehicleValue, saveVehicleValue, selectVehicleValue, selectedVehicle, selectedVehicleId, vehicles],
  );

  return <MobileVehicleContext.Provider value={value}>{children}</MobileVehicleContext.Provider>;
}

export function useMobileVehicles() {
  const value = useContext(MobileVehicleContext);

  if (!value) {
    throw new Error('useMobileVehicles must be used within MobileVehicleProvider');
  }

  return value;
}
