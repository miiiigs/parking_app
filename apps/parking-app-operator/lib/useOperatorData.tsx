"use client";

import { useEffect, useState } from 'react';
import { refreshOperatorData, subscribeOperatorData } from './operatorDataStore';
import type { OperatorDashboardData } from './types';

export function useOperatorData() {
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeOperatorData(({ data: d, loading: l }) => {
      setData(d);
      setLoading(l);
    });

    return () => unsub();
  }, []);

  return {
    data,
    loading,
    refresh: (options?: { silent?: boolean }) => refreshOperatorData(options),
  } as const;
}
