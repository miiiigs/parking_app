import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { ParkingLot } from '../features/parking/types';
import { parkingLots as fallbackParkingLots } from '../features/parking/data/parkingLots';
import { useParkingFlowStore } from '../features/parking/store/useParkingFlowStore';
import { loadParkingLots } from '../lib/parkingData';
import { getSupabaseClient } from '../lib/supabaseClient';

type MobileParkingDataContextValue = {
  lots: ParkingLot[];
  isLiveData: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const MobileParkingDataContext = createContext<MobileParkingDataContextValue | null>(null);

function buildFallbackLots() {
  return fallbackParkingLots.map((lot) => ({
    ...lot,
    lotLayout: lot.lotLayout ?? null,
  }));
}

export function MobileParkingDataProvider({ children }: { children: React.ReactNode }) {
  const restoreWorkflow = useParkingFlowStore((state) => state.restoreWorkflow);
  const [lots, setLots] = useState<ParkingLot[]>(buildFallbackLots());
  const [isLiveData, setIsLiveData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isRefreshingRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = React.useCallback(async () => {
    if (isRefreshingRef.current) {
      refreshQueuedRef.current = true;
      return;
    }

    isRefreshingRef.current = true;

    try {
      const result = await loadParkingLots();
      setLots(result.lots);
      setIsLiveData(result.isLiveData);

      if (!hasRestoredRef.current) {
        hasRestoredRef.current = true;
        await restoreWorkflow(result.lots);
      } else {
        await restoreWorkflow(result.lots);
      }
    } catch {
      const fallbackLots = buildFallbackLots();
      setLots(fallbackLots);
      setIsLiveData(false);
      await restoreWorkflow(fallbackLots);
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;

      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        void refresh();
      }
    }
  }, [restoreWorkflow]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        void refresh();
      }, 250);
    };

    const supabase = getSupabaseClient();
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

    if (supabase) {
      channel = supabase
        .channel('mobile-live-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_sessions' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, scheduleRefresh)
        .subscribe();
    }

    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void refresh();
      }
    });

    return () => {
      appStateSubscription.remove();

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, [refresh]);

  const value = useMemo<MobileParkingDataContextValue>(
    () => ({
      lots,
      isLiveData,
      isLoading,
      refresh,
    }),
    [isLiveData, isLoading, lots, refresh],
  );

  return <MobileParkingDataContext.Provider value={value}>{children}</MobileParkingDataContext.Provider>;
}

export function useMobileParkingData() {
  const value = useContext(MobileParkingDataContext);

  if (!value) {
    throw new Error('useMobileParkingData must be used within MobileParkingDataProvider');
  }

  return value;
}
