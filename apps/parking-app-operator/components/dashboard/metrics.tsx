"use client";

import { AlertCircle, CheckCircle, Clock, ParkingCircle, TrendingUp, XCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatCurrency';
import { useOperatorData } from '@/lib/useOperatorData';
import type { DashboardMetrics } from '@/lib/types';

const metricItems = (metrics: DashboardMetrics) => [
  {
    label: 'Active Reservations',
    value: metrics.activeReservations,
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  {
    label: 'Occupied Slots',
    value: metrics.occupiedSlots,
    icon: ParkingCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  {
    label: 'Completed Sessions',
    value: metrics.completedSessions,
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
  },
  {
    label: 'No-Shows',
    value: metrics.noShows,
    icon: XCircle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
  },
  {
    label: 'Data Mismatches',
    value: metrics.dataMismatches,
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
  {
    label: 'Total Revenue',
    value: formatCurrency(metrics.totalRevenue),
    icon: TrendingUp,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
];

export function DashboardMetrics() {
  const { data, loading } = useOperatorData();
  const metrics = data?.metrics ?? {
    activeReservations: 0,
    occupiedSlots: 0,
    completedSessions: 0,
    noShows: 0,
    dataMismatches: 0,
    totalRevenue: 0,
    occupancyRate: 0,
    averageSessionDuration: 0,
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Key Metrics</h2>
      {loading && !data ? <div className="text-muted-foreground">Loading metrics...</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricItems(metrics).map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
                  <div className={`rounded-lg p-2 ${metric.bgColor}`}>
                    <Icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-3xl font-bold text-foreground">{metrics.occupancyRate}%</div>
              <div className="h-2 w-full rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-green-400"
                  style={{ width: `${metrics.occupancyRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.occupiedSlots} of {data?.parkingMap?.totalSlots ?? 24} slots occupied
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Session Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-3xl font-bold text-foreground">{metrics.averageSessionDuration} min</div>
              <p className="text-xs text-muted-foreground">Average duration of completed sessions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
