"use client";

import { useSyncExternalStore } from 'react';
import { getOperatorDataSnapshot, refreshOperatorData, subscribeOperatorData } from './operatorDataStore';

export function useOperatorData() {
  const state = useSyncExternalStore(
    subscribeOperatorData,
    getOperatorDataSnapshot,
    getOperatorDataSnapshot,
  );

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refresh: (options?: { silent?: boolean; force?: boolean }) => refreshOperatorData(options),
  } as const;
}
