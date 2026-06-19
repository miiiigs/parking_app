import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PricingSettingsPanel } from '@/components/dashboard/pricing-settings-panel';

export default function ParkingSetupPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Parking Setup</h1>
          <p className="text-muted-foreground">
            Dedicated parking configuration for rates, billing intervals, and grace period durations.
          </p>
        </div>

        <PricingSettingsPanel />
      </div>
    </DashboardLayout>
  );
}
