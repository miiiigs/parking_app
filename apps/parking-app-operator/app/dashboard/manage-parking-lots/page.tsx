import { LocationManagementPanel } from '@/components/dashboard/location-management-panel';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function ManageParkingLotsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Manage Parking Lots</h1>
          <p className="max-w-3xl text-muted-foreground">
            Admin-only global lot administration for creating parking lots, maintaining shared lot metadata, and choosing which lot record to edit without mixing those controls into lot-scoped setup.
          </p>
        </div>

        <LocationManagementPanel />
      </div>
    </DashboardLayout>
  );
}
