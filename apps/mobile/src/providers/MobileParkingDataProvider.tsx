import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { ParkingLot } from '../features/parking/types';
import { useParkingFlowStore } from '../features/parking/store/useParkingFlowStore';
import { loadParkingLots } from '../lib/parkingData';
import { getSupabaseClient } from '../lib/supabaseClient';

type MobileParkingDataStatus = 'live' | 'stale' | 'demo';

type MobileParkingDataContextValue = {
  lots: ParkingLot[];
  isLiveData: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  status: MobileParkingDataStatus;
  error: string | null;
  lastSyncedAt: number | null;
  refresh: () => Promise<void>;
};

const MobileParkingDataContext = createContext<MobileParkingDataContextValue | null>(null);

export function MobileParkingDataProvider({ children }: { children: React.ReactNode }) {
  const restoreWorkflow = useParkingFlowStore((state) => state.restoreWorkflow);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [isLiveData, setIsLiveData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<MobileParkingDataStatus>('demo');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const isRefreshingRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const lotsRef = useRef<ParkingLot[]>([]);
  const isLiveDataRef = useRef(false);
  const statusRef = useRef<MobileParkingDataStatus>('demo');

  const refresh = React.useCallback(async () => {
    if (isRefreshingRef.current) {
      refreshQueuedRef.current = true;
      return;
    }

    isRefreshingRef.current = true;
    const isInitialLoad = !hasLoadedOnceRef.current;

    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const result = await loadParkingLots();
      hasLoadedOnceRef.current = true;
      setLots(result.lots);
      setIsLiveData(result.isLiveData);
      setStatus(result.mode);
      setError(null);

      if (result.isLiveData) {
        setLastSyncedAt(Date.now());
      }

      if (!hasRestoredRef.current) {
        hasRestoredRef.current = true;
        await restoreWorkflow(result.lots);
      } else {
        await restoreWorkflow(result.lots);
      }
    } catch (nextError) {
      hasLoadedOnceRef.current = true;
      const message = nextError instanceof Error ? nextError.message : 'Unable to sync live parking data.';
      setError(message);

      if (lotsRef.current.length === 0) {
        setLots([]);
        setIsLiveData(false);
        setStatus('stale');
      } else {
        setStatus(isLiveDataRef.current ? 'stale' : statusRef.current);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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
    lotsRef.current = lots;
  }, [lots]);

  useEffect(() => {
    isLiveDataRef.current = isLiveData;
  }, [isLiveData]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_lot_layouts' }, scheduleRefresh)
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
      isRefreshing,
      status,
      error,
      lastSyncedAt,
      refresh,
    }),
    [error, isLiveData, isLoading, isRefreshing, lastSyncedAt, lots, refresh, status],
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
