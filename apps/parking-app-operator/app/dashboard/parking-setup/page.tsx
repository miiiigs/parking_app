'use client';

import Link from 'next/link';
import { ArrowRight, MapPinned } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PricingSettingsPanel } from '@/components/dashboard/pricing-settings-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';

export default function ParkingSetupPage() {
  const { activeLocation, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Parking Setup</h1>
          <p className="text-muted-foreground">
            Selected-lot setup for pricing, billing intervals, and grace period durations.
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <MapPinned className="h-3.5 w-3.5 text-primary" />
                Selected dashboard lot
              </div>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-foreground">
                  {activeLocation?.name ?? 'No active parking lot selected'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {activeLocation
                    ? `${activeLocation.address ?? 'Address unavailable'}${activeLocation.city ? `, ${activeLocation.city}` : ''}`
                    : 'Choose an active lot from the header location switcher before changing pricing or grace periods.'}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Lot-scoped setup only</Badge>
                <Badge variant="secondary">Pricing applies to the selected lot</Badge>
              </div>
            </div>
            {isAdmin ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/manage-parking-lots">
                  Manage Parking Lots
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <PricingSettingsPanel />
      </div>
    </DashboardLayout>
  );
}
