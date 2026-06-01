import type { ParkingLotDefinition } from '@parking/shared/parkingMap';

import { getSupabaseClient } from './supabaseClient';

export type ParkingLocation = {
  id: string;
  name: string;
  address: string;
  city: string;
};

export type ParkingSlot = {
  id: string;
  label: string;
  status: 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';
  displayOrder: number;
  qrToken: string;
};

export type ParkingDashboardData = {
  location: ParkingLocation | null;
  slots: ParkingSlot[];
  lotLayout: ParkingLotDefinition | null;
  isLiveData: boolean;
};

const fallbackLocation: ParkingLocation = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'BGC Pilot Site',
  address: 'Bonifacio Global City, Taguig',
  city: 'Bonifacio Global City',
};

const fallbackSlots: ParkingSlot[] = Array.from({ length: 20 }, (_, index) => {
  const slotNumber = index + 1;

  return {
    id: `fallback-slot-${slotNumber}`,
    label: `Slot #${slotNumber}`,
    status: slotNumber === 12 ? 'reserved' : 'available',
    displayOrder: slotNumber,
    qrToken: `bgc-pilot-slot-${slotNumber}`,
  };
});

export function getFallbackParkingData(): ParkingDashboardData {
  return {
    location: fallbackLocation,
    slots: fallbackSlots,
    lotLayout: null,
    isLiveData: false,
  };
}

function parseLotLayout(value: unknown): ParkingLotDefinition | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const layout = value as ParkingLotDefinition;
  if (!Array.isArray(layout.slots) || !Array.isArray(layout.roads)) {
    return null;
  }

  return layout;
}

async function loadLotLayoutForLocation(supabase: NonNullable<ReturnType<typeof getSupabaseClient>>, locationId: string) {
  const { data, error } = await supabase
    .from('parking_lot_layouts')
    .select('layout')
    .eq('location_id', locationId)
    .maybeSingle();

  if (error || !data?.layout) {
    return null;
  }

  return parseLotLayout(data.layout);
}

export async function loadParkingDashboardData(): Promise<ParkingDashboardData> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return getFallbackParkingData();
  }

  // Try to use a batched RPC that returns the dashboard and current user's reservation/session
  try {
    // Acquire user if possible
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user ?? null;

    if (currentUser) {
      const { data: snapshot, error } = await supabase.rpc('mobile_dashboard_snapshot', { p_user_id: currentUser.id });

      if (!error && snapshot) {
        const loc = snapshot.location ?? null;
        const slots = Array.isArray(snapshot.slots) ? snapshot.slots : (snapshot.slots ? Object.values(snapshot.slots) : []);

        return {
          location: loc ? { id: loc.id, name: loc.name, address: loc.address, city: loc.city } : null,
          slots: (slots || []).map((s: any) => ({ id: s.id, label: s.label, status: s.status, displayOrder: s.displayOrder, qrToken: s.qrToken })),
          lotLayout: parseLotLayout(snapshot.lotLayout),
          isLiveData: true,
        };
      }
    }
  } catch (_) {
    // Fall back to standard queries on any error
  }

  const { data: locations, error: locationError } = await supabase
    .from('locations')
    .select('id, name, address, city')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  if (locationError || !locations || locations.length === 0) {
    return getFallbackParkingData();
  }

  const activeLocation = locations[0] as ParkingLocation;

  const { data: slots, error: slotError } = await supabase
    .from('parking_slots')
    .select('id, slot_label, status, display_order, qr_token')
    .eq('location_id', activeLocation.id)
    .order('display_order', { ascending: true });

  const lotLayout = await loadLotLayoutForLocation(supabase, activeLocation.id);

  if (slotError || !slots || slots.length === 0) {
    return {
      location: activeLocation,
      slots: fallbackSlots,
      lotLayout,
      isLiveData: false,
    };
  }

  return {
    location: activeLocation,
    slots: slots.map((slot) => ({
      id: slot.id,
      label: slot.slot_label,
      status: slot.status,
      displayOrder: slot.display_order,
      qrToken: slot.qr_token,
    })),
    lotLayout,
    isLiveData: true,
  };
}