"use client";

import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, RefreshCcw, ShieldCheck, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useOperatorData } from '@/lib/useOperatorData';

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return 'No successful sync yet';
  }

  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function OperatorSyncBanner() {
  const { data, error, loading, refresh } = useOperatorData();
  const health = data?.systemHealth ?? null;
  const isOffline = health?.database === 'offline' || health?.overall === 'offline';
  const isDegraded = !isOffline && (health?.overall === 'degraded' || Boolean(error));
  const toneClasses = isOffline
    ? 'border-red-500/30 bg-red-500/10 text-red-100'
    : isDegraded
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100';
  const Icon = isOffline ? WifiOff : isDegraded ? AlertTriangle : ShieldCheck;
  const title = loading && !data
    ? 'Loading operator dashboard'
    : isOffline
      ? 'Dashboard backend unreachable'
      : isDegraded
        ? 'Dashboard sync degraded'
        : 'Dashboard sync healthy';
  const description = isOffline
    ? 'The operator app is using the last available dashboard data until Supabase responds again.'
    : isDegraded
      ? 'Realtime or refresh health needs attention, but operators can continue working with the current snapshot.'
      : 'Realtime sync and dashboard refresh are operating normally.';

  return (
    <div className={`flex flex-col gap-3 border-b px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between ${toneClasses}`}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 rounded-full bg-black/10 p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs opacity-90">{description}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
            <span>Last sync: {formatTimestamp(health?.lastSuccessfulSyncAt)}</span>
            <span>Realtime: {health?.realtime ?? 'unknown'}</span>
            <span>Mode: {health?.syncMode ?? 'unknown'}</span>
            <span>Failed actions: {health?.failedActionCount ?? 0}</span>
          </div>
          {error ? <div className="mt-1 text-xs opacity-90">{error}</div> : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-current/20 bg-transparent text-current hover:bg-black/10 hover:text-current"
          onClick={() => void refresh({ silent: true, force: true })}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh now
        </Button>
      </div>
    </div>
  );
}
