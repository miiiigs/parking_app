import type { ParkingLotDefinition, ParkingSlotStatus } from '../../../../packages/shared/src/parkingMap';
import { applyLiveSlotStatuses, buildParkingLotDefinitionFromSlots } from '../../../../packages/shared/src/parkingMap';

import { parkingLots as sampleParkingLots } from '../features/parking/data/parkingLots';
import type { ParkingLot } from '../features/parking/types';
import { getSupabaseClient } from './supabaseClient';

type LiveLocationRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  code: string;
};

type LiveSlotRow = {
  id: string;
  slot_label: string;
  status: ParkingSlotStatus;
  display_order: number;
  qr_token: string;
};

type LiveLayoutRow = {
  location_id: string;
  layout: unknown;
};

const DEFAULT_LIVE_RATE = 50;

export type ParkingDataLoadResult = {
  lots: ParkingLot[];
  isLiveData: boolean;
};

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

function mapLayoutToParkingLot(location: LiveLocationRow, layout: ParkingLotDefinition, liveSlots: LiveSlotRow[]): ParkingLot {
  const appliedLayout = applyLiveSlotStatuses(
    layout,
    liveSlots.map((slot) => ({
      id: slot.id,
      label: slot.slot_label,
      status: slot.status,
      displayOrder: slot.display_order,
    })),
  );

  const slots = appliedLayout.slots.map((slot) => {
    const live = liveSlots.find((entry) => entry.id === slot.id) ?? liveSlots.find((entry) => entry.slot_label.toLowerCase() === slot.label.toLowerCase());

    return {
      id: slot.id,
      number: slot.label,
      isAvailable: slot.status === 'available',
      status: slot.status,
      x: slot.x,
      y: slot.y,
      qrToken: live?.qr_token,
    };
  });

  const availableSlots = slots.filter((slot) => slot.isAvailable).length;

  return {
    id: location.id,
    locationId: location.id,
    name: location.name,
    address: location.address,
    city: location.city,
    availableSlots,
    totalSlots: slots.length,
    distanceKm: 0,
    pricePerHour: DEFAULT_LIVE_RATE,
    features: ['Live data'],
    slots,
    lotLayout: appliedLayout,
  };
}

function buildFallbackLots() {
  return sampleParkingLots.map((lot) => ({
    ...lot,
    lotLayout: null,
  }));
}

export async function loadParkingLots(): Promise<ParkingDataLoadResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      lots: buildFallbackLots(),
      isLiveData: false,
    };
  }

  const { data: locations, error: locationError } = await supabase
    .from('locations')
    .select('id, name, address, city, code')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (locationError || !locations || locations.length === 0) {
    return {
      lots: buildFallbackLots(),
      isLiveData: false,
    };
  }

  const liveLocations = locations as LiveLocationRow[];
  const lots: ParkingLot[] = [];

  for (const location of liveLocations) {
    const [{ data: slotRows }, { data: layoutRows }] = await Promise.all([
      supabase
        .from('parking_slots')
        .select('id, slot_label, status, display_order, qr_token')
        .eq('location_id', location.id)
        .order('display_order', { ascending: true }),
      supabase
        .from('parking_lot_layouts')
        .select('location_id, layout')
        .eq('location_id', location.id)
        .maybeSingle(),
    ]);

    const liveSlots = (slotRows ?? []) as LiveSlotRow[];
    const parsedLayout = parseLotLayout((layoutRows as LiveLayoutRow | null)?.layout);
    const fallbackLayout = buildParkingLotDefinitionFromSlots(
      liveSlots.map((slot) => ({
        id: slot.id,
        slotLabel: slot.slot_label,
        status: slot.status,
        displayOrder: slot.display_order,
      })),
      location.name,
    );
    const nextLayout = parsedLayout ? mapLayoutToParkingLot(location, parsedLayout, liveSlots) : mapLayoutToParkingLot(location, fallbackLayout, liveSlots);

    lots.push(nextLayout);
  }

  return {
    lots,
    isLiveData: true,
  };
}

export async function loadParkingLotById(lotId: string) {
  const { lots } = await loadParkingLots();
  return lots.find((lot) => lot.id === lotId) ?? null;
}
