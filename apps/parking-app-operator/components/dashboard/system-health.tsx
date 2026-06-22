"use client";

import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock3, Database, Radio, RefreshCcw, WifiOff } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SystemHealthSkeleton } from '@/components/dashboard/loading-skeletons';
import { useOperatorData } from '@/lib/useOperatorData';
import type { HealthState } from '@/lib/types';

function healthTone(state: HealthState) {
  switch (state) {
    case 'healthy':
      return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    case 'degraded':
      return 'text-amber-200 border-amber-500/30 bg-amber-500/10';
    case 'offline':
      return 'text-red-300 border-red-500/30 bg-red-500/10';
    default:
      return 'text-muted-foreground border-border bg-secondary/30';
  }
}

function healthIcon(state: HealthState) {
  switch (state) {
    case 'healthy':
      return CheckCircle2;
    case 'degraded':
      return AlertTriangle;
    case 'offline':
      return WifiOff;
    default:
      return Clock3;
  }
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'No sync yet';
  }

  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function SystemHealth({ compact = false }: { compact?: boolean }) {
  const { data, loading } = useOperatorData();

  if (loading && !data) {
    return <SystemHealthSkeleton compact={compact} />;
  }

  const health = data?.systemHealth ?? null;

  const overallState = health?.overall ?? 'unknown';
  const databaseState = health?.database ?? 'unknown';
  const realtimeState = health?.realtime ?? 'unknown';
  const OverallIcon = healthIcon(overallState);
  const DatabaseIcon = Database;
  const RealtimeIcon = Radio;
  const SyncIcon = RefreshCcw;

  return (
    <div className={compact ? 'grid gap-4 md:grid-cols-2' : 'grid gap-4 xl:grid-cols-4'}>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Overall Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium capitalize ${healthTone(overallState)}`}>
            <OverallIcon className="h-4 w-4" />
            {overallState}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Failed actions: <span className="font-semibold text-foreground">{health?.failedActionCount ?? 0}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Supabase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium capitalize ${healthTone(databaseState)}`}>
            <DatabaseIcon className="h-4 w-4" />
            {databaseState}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Last dashboard refresh: <span className="font-semibold text-foreground">{formatTimestamp(health?.lastDashboardRefreshAt ?? null)}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Realtime</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium capitalize ${healthTone(realtimeState)}`}>
            <RealtimeIcon className="h-4 w-4" />
            {realtimeState}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Mode: <span className="font-semibold text-foreground capitalize">{health?.syncMode ?? 'unknown'}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Sync Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-1 text-sm font-medium text-foreground">
            <SyncIcon className="h-4 w-4" />
            {formatTimestamp(health?.lastSuccessfulSyncAt ?? null)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Last realtime event: <span className="font-semibold text-foreground">{formatTimestamp(health?.lastRealtimeEventAt ?? null)}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
