'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockMetrics } from '@/lib/mock-data';
import {
  Clock,
  ParkingCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

const metricItems = [
  {
    label: 'Active Reservations',
    value: mockMetrics.activeReservations,
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  {
    label: 'Occupied Slots',
    value: mockMetrics.occupiedSlots,
    icon: ParkingCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  {
    label: 'Completed Sessions',
    value: mockMetrics.completedSessions,
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
  },
  {
    label: 'No-Shows',
    value: mockMetrics.noShows,
    icon: XCircle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
  },
  {
    label: 'Data Mismatches',
    value: mockMetrics.dataMismatches,
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
  {
    label: 'Total Revenue',
    value: `₹${mockMetrics.totalRevenue.toLocaleString()}`,
    icon: TrendingUp,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
];

export function DashboardMetrics() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Key Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricItems.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`w-4 h-4 ${metric.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {metric.label === 'Occupancy Rate' && 'of total capacity'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Occupancy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-foreground">
                  {mockMetrics.occupancyRate}%
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-400 to-green-400 h-2 rounded-full"
                  style={{ width: `${mockMetrics.occupancyRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {mockMetrics.occupiedSlots} of 24 slots occupied
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Session Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-3xl font-bold text-foreground">
                {mockMetrics.averageSessionDuration} min
              </div>
              <p className="text-xs text-muted-foreground">
                Average duration of completed sessions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
