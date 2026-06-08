'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DashboardMetrics } from '@/components/dashboard/metrics';
import { RecentReservations } from '@/components/dashboard/recent-reservations';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Overview of your parking operations for today
          </p>
        </div>

        <DashboardMetrics />
        <RecentReservations />
      </div>
    </DashboardLayout>
  );
}
