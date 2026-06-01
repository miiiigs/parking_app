import Link from 'next/link';

import { ParkingMapCanvas } from '../../components/parking-map/ParkingMapCanvas';
import { applyLiveSlotStatuses, buildParkingLotDefinitionFromSlots } from '../../lib/parkingMap';
import { getFallbackAdminDashboardData, loadAdminDashboardData } from '../../lib/dashboard';
import { fetchLotBuilderPersistedState } from '../../lib/parkingLotLayout';

export default async function ParkingMapPage() {
  const dashboardData = (await loadAdminDashboardData()) ?? getFallbackAdminDashboardData();
  const persisted = await fetchLotBuilderPersistedState();
  const baseLot =
    persisted?.layout ??
    buildParkingLotDefinitionFromSlots(dashboardData.slots, dashboardData.location?.name ?? 'BGC Pilot Site');
  const lot = applyLiveSlotStatuses(
    baseLot,
    dashboardData.slots.map((slot) => ({
      id: slot.id,
      label: slot.slotLabel,
      status: slot.status,
      displayOrder: slot.displayOrder,
    })),
  );

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#7bd3ff', textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 12, fontWeight: 800, margin: 0 }}>Parking Lot View</p>
          <h1 style={{ margin: '8px 0 0', fontSize: 40, lineHeight: 1.05 }}>Separate map page for the admin.</h1>
          <p style={{ color: '#a9bdd6', maxWidth: 780, lineHeight: 1.6 }}>
            This page reuses the same lot definition model as the mobile app, so the admin can inspect the parking layout, slot state, roads, and direction paths in one place.
          </p>
        </div>
        <Link
          href="/lot-builder"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            borderRadius: 12,
            background: '#3dd6a5',
            color: '#071018',
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          Open Lot Builder
        </Link>
      </section>

      <ParkingMapCanvas lot={lot} />
    </main>
  );
}