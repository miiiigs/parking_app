import type { ParkingLotDefinition, ParkingSlotStatus } from '@parking/shared';
import { applyLiveSlotStatuses, buildParkingLotDefinitionFromSlots } from '@parking/shared';
import {
  DEFAULT_PARKING_PRICING,
  formatParkingPricingSummary,
  normalizeParkingPricingConfig,
  type ParkingPricingConfig,
} from '@parking/shared';

import { parkingLots as sampleParkingLots } from '../features/parking/data/parkingLots';
import type { ParkingLot } from '../features/parking/types';
import { getSupabaseClient } from './supabaseClient';

type LiveLocationRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  code: string;
  pricing_mode?: string | null;
  flat_rate_amount?: number | null;
  fixed_hourly_rate?: number | null;
  first_period_hours?: number | null;
  first_period_rate?: number | null;
  succeeding_hourly_rate?: number | null;
  entry_grace_minutes?: number | null;
  exit_grace_minutes?: number | null;
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

export type ParkingDataLoadResult = {
  lots: ParkingLot[];
  isLiveData: boolean;
};

function isMissingPricingColumnError(message: string | undefined) {
  if (!message) {
    return false;
  }

  return [
    'pricing_mode',
    'flat_rate_amount',
    'fixed_hourly_rate',
    'first_period_hours',
    'first_period_rate',
    'succeeding_hourly_rate',
    'entry_grace_minutes',
    'exit_grace_minutes',
  ].some((column) => message.includes(column));
}

function buildLocationPricingConfig(location: LiveLocationRow): ParkingPricingConfig {
  return normalizeParkingPricingConfig({
    mode: location.pricing_mode ?? DEFAULT_PARKING_PRICING.mode,
    flatRateAmount: location.flat_rate_amount ?? DEFAULT_PARKING_PRICING.flatRateAmount,
    fixedHourlyRate: location.fixed_hourly_rate ?? DEFAULT_PARKING_PRICING.fixedHourlyRate,
    firstPeriodHours: location.first_period_hours ?? DEFAULT_PARKING_PRICING.firstPeriodHours,
    firstPeriodRate: location.first_period_rate ?? DEFAULT_PARKING_PRICING.firstPeriodRate,
    succeedingHourlyRate: location.succeeding_hourly_rate ?? DEFAULT_PARKING_PRICING.succeedingHourlyRate,
    entryGraceMinutes: location.entry_grace_minutes ?? DEFAULT_PARKING_PRICING.entryGraceMinutes,
    exitGraceMinutes: location.exit_grace_minutes ?? DEFAULT_PARKING_PRICING.exitGraceMinutes,
  });
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

function mapLayoutToParkingLot(location: LiveLocationRow, layout: ParkingLotDefinition, liveSlots: LiveSlotRow[]): ParkingLot {
  const pricingConfig = buildLocationPricingConfig(location);
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
    pricePerHour: pricingConfig.mode === 'flat_rate' ? pricingConfig.flatRateAmount : pricingConfig.mode === 'tiered' ? pricingConfig.firstPeriodRate : pricingConfig.fixedHourlyRate,
    pricingConfig,
    features: ['Live data', formatParkingPricingSummary(pricingConfig)],
    slots,
    lotLayout: appliedLayout,
  };
}

function buildFallbackLots() {
  return sampleParkingLots.map((lot) => ({
    ...lot,
    pricingConfig: normalizeParkingPricingConfig(
      lot.pricingConfig ?? {
        mode: 'fixed_rate',
        flatRateAmount: lot.pricePerHour,
        fixedHourlyRate: lot.pricePerHour,
        firstPeriodHours: 3,
        firstPeriodRate: lot.pricePerHour,
        succeedingHourlyRate: 20,
        entryGraceMinutes: 15,
        exitGraceMinutes: 15,
      },
    ),
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

  let locations: LiveLocationRow[] | null = null;
  let locationError: { message?: string } | null = null;

  {
    const response = await supabase
      .from('locations')
      .select('id, name, address, city, code, pricing_mode, flat_rate_amount, fixed_hourly_rate, first_period_hours, first_period_rate, succeeding_hourly_rate, entry_grace_minutes, exit_grace_minutes')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    locations = (response.data as LiveLocationRow[] | null) ?? null;
    locationError = response.error;
  }

  if (locationError && isMissingPricingColumnError(locationError.message)) {
    const response = await supabase
      .from('locations')
      .select('id, name, address, city, code')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    locations = (response.data as LiveLocationRow[] | null) ?? null;
    locationError = response.error;
  }

  if (locationError || !locations || locations.length === 0) {
    return {
      lots: buildFallbackLots(),
      isLiveData: false,
    };
  }
  const liveLocations = locations;
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
