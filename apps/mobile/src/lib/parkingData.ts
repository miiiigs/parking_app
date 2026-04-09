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
  };
}

export async function loadParkingDashboardData(): Promise<ParkingDashboardData> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return getFallbackParkingData();
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

  if (slotError || !slots || slots.length === 0) {
    return {
      location: activeLocation,
      slots: fallbackSlots,
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
  };
}