'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DashboardMetrics } from '@/components/dashboard/metrics';
import { RecentReservations } from '@/components/dashboard/recent-reservations';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your parking operations for today
          </p>
        </div>

        <DashboardMetrics />
        <RecentReservations />
      </div>
    </DashboardLayout>
  );
}
