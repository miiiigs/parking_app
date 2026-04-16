'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getAdminRealtimeClient } from '../lib/realtimeClient';

type Props = {
  intervalMs?: number;
};

export function DashboardLiveRefresh({ intervalMs = 8000 }: Props) {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);
  const [syncMode, setSyncMode] = useState<'realtime' | 'polling' | 'disabled'>('polling');

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();

      if (now - lastRefreshAtRef.current < 1500) {
        return;
      }

      lastRefreshAtRef.current = now;
      router.refresh();
    };

    refresh();

    const realtimeClient = getAdminRealtimeClient();

    if (!realtimeClient) {
      setSyncMode('disabled');

      const fallbackIntervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          refresh();
        }
      }, intervalMs);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          refresh();
        }
      };

      const handleWindowFocus = () => {
        refresh();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleWindowFocus);

      return () => {
        window.clearInterval(fallbackIntervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleWindowFocus);
      };
    }

    setSyncMode('realtime');

    const channel = realtimeClient
      .channel('admin-dashboard-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_sessions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refresh)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncMode('realtime');
          refresh();
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncMode('polling');
        }
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    const handleWindowFocus = () => {
      refresh();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, intervalMs);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      void realtimeClient.removeChannel(channel);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [intervalMs, router]);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 16,
        border: '1px solid #26405f',
        background: 'linear-gradient(180deg, #0f1b2c 0%, #08111d 100%)',
        color: '#f4f7fb',
        fontSize: 13,
        fontWeight: 700,
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.18)',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: syncMode === 'realtime' ? '#3dd6a5' : syncMode === 'polling' ? '#7bd3ff' : '#ffb74d',
          boxShadow: `0 0 0 6px ${syncMode === 'realtime' ? '#3dd6a522' : syncMode === 'polling' ? '#7bd3ff22' : '#ffb74d22'}`,
          flexShrink: 0,
        }}
      />
      <span style={{ display: 'grid', gap: 2 }}>
        <strong style={{ fontSize: 13, fontWeight: 800 }}>
          {syncMode === 'realtime' ? 'Realtime connected' : syncMode === 'polling' ? 'Live sync polling' : 'Live sync fallback'}
        </strong>
        <span style={{ color: '#a9bdd6', fontSize: 11, fontWeight: 600 }}>
          {syncMode === 'realtime' ? 'Fast updates from Supabase' : syncMode === 'polling' ? 'Polling backup active' : 'Realtime unavailable'}
        </span>
      </span>
    </span>
  );
}