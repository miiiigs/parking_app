import type { ParkingLotDefinition, ParkingSlotStatus } from '@parking/shared';
import { applyLiveSlotStatuses, buildParkingLotDefinitionFromSlots } from '@parking/shared';
import {
  DEFAULT_PARKING_PRICING,
  DEFAULT_RESERVATION_PRICING,
  formatParkingPricingSummary,
  normalizeReservationPricingConfig,
  normalizeParkingPricingConfig,
  type ParkingPricingConfig,
  type ReservationPricingConfig,
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
  fixed_rate_amount?: number | null;
  fixed_rate_interval_minutes?: number | null;
  first_period_minutes?: number | null;
  first_period_rate?: number | null;
  succeeding_rate_amount?: number | null;
  succeeding_rate_interval_minutes?: number | null;
  entry_grace_minutes?: number | null;
  exit_grace_minutes?: number | null;
  reservation_fee_30_minutes?: number | null;
  reservation_fee_60_minutes?: number | null;
  reservation_fee_120_minutes?: number | null;
  fixed_hourly_rate?: number | null;
  first_period_hours?: number | null;
  succeeding_hourly_rate?: number | null;
};

type LiveSlotRow = {
  id: string;
  location_id: string;
  slot_label: string;
  status: ParkingSlotStatus;
  display_order: number;
  qr_token: string;
  slot_kind?: 'standard' | 'walk_in_hub' | null;
};

type LiveLayoutRow = {
  location_id: string;
  layout: unknown;
};

export type ParkingDataLoadResult = {
  lots: ParkingLot[];
  isLiveData: boolean;
  mode: 'live' | 'demo';
};

function isMissingPricingColumnError(message: string | undefined) {
  if (!message) {
    return false;
  }

  return [
    'pricing_mode',
    'flat_rate_amount',
    'fixed_rate_amount',
    'fixed_rate_interval_minutes',
    'first_period_minutes',
    'first_period_rate',
    'succeeding_rate_amount',
    'succeeding_rate_interval_minutes',
    'entry_grace_minutes',
    'exit_grace_minutes',
    'reservation_fee_30_minutes',
    'reservation_fee_60_minutes',
    'reservation_fee_120_minutes',
    'fixed_hourly_rate',
    'first_period_hours',
    'succeeding_hourly_rate',
  ].some((column) => message.includes(column));
}

function isMissingSlotKindColumnError(message: string | undefined) {
  const normalized = message?.toLowerCase() ?? '';
  return (
    normalized.includes('slot_kind')
    && normalized.includes('does not exist')
  );
}

function buildLocationPricingConfig(location: LiveLocationRow): ParkingPricingConfig {
  return normalizeParkingPricingConfig({
    mode: location.pricing_mode ?? DEFAULT_PARKING_PRICING.mode,
    flatRateAmount: location.flat_rate_amount ?? DEFAULT_PARKING_PRICING.flatRateAmount,
    fixedRateAmount: location.fixed_rate_amount ?? location.fixed_hourly_rate ?? DEFAULT_PARKING_PRICING.fixedRateAmount,
    fixedRateIntervalMinutes: location.fixed_rate_interval_minutes ?? DEFAULT_PARKING_PRICING.fixedRateIntervalMinutes,
    firstPeriodMinutes:
      location.first_period_minutes
      ?? (location.first_period_hours ? location.first_period_hours * 60 : DEFAULT_PARKING_PRICING.firstPeriodMinutes),
    firstPeriodRate: location.first_period_rate ?? DEFAULT_PARKING_PRICING.firstPeriodRate,
    succeedingRateAmount: location.succeeding_rate_amount ?? location.succeeding_hourly_rate ?? DEFAULT_PARKING_PRICING.succeedingRateAmount,
    succeedingRateIntervalMinutes: location.succeeding_rate_interval_minutes ?? DEFAULT_PARKING_PRICING.succeedingRateIntervalMinutes,
    entryGraceMinutes: location.entry_grace_minutes ?? DEFAULT_PARKING_PRICING.entryGraceMinutes,
    exitGraceMinutes: location.exit_grace_minutes ?? DEFAULT_PARKING_PRICING.exitGraceMinutes,
  });
}

function buildLocationReservationPricingConfig(location: LiveLocationRow): ReservationPricingConfig {
  return normalizeReservationPricingConfig({
    fee30Minutes: location.reservation_fee_30_minutes ?? DEFAULT_RESERVATION_PRICING.fee30Minutes,
    fee60Minutes: location.reservation_fee_60_minutes ?? DEFAULT_RESERVATION_PRICING.fee60Minutes,
    fee120Minutes: location.reservation_fee_120_minutes ?? DEFAULT_RESERVATION_PRICING.fee120Minutes,
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
  const reservationPricing = buildLocationReservationPricingConfig(location);
  const liveSlotsById = new Map(liveSlots.map((slot) => [slot.id, slot] as const));
  const liveSlotsByLabel = new Map(liveSlots.map((slot) => [slot.slot_label.toLowerCase(), slot] as const));
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
    const live = liveSlotsById.get(slot.id) ?? liveSlotsByLabel.get(slot.label.toLowerCase());

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
    pricePerHour: pricingConfig.mode === 'flat_rate' ? pricingConfig.flatRateAmount : pricingConfig.mode === 'tiered' ? pricingConfig.firstPeriodRate : pricingConfig.fixedRateAmount,
    pricingConfig,
    reservationPricing,
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
        fixedRateAmount: lot.pricePerHour,
        fixedRateIntervalMinutes: 60,
        firstPeriodMinutes: 180,
        firstPeriodRate: lot.pricePerHour,
        succeedingRateAmount: 20,
        succeedingRateIntervalMinutes: 60,
        entryGraceMinutes: 15,
        exitGraceMinutes: 15,
      },
    ),
    reservationPricing: normalizeReservationPricingConfig(lot.reservationPricing ?? DEFAULT_RESERVATION_PRICING),
    lotLayout: null,
  }));
}

export async function loadParkingLots(): Promise<ParkingDataLoadResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      lots: buildFallbackLots(),
      isLiveData: false,
      mode: 'demo',
    };
  }

  let locations: LiveLocationRow[] | null = null;
  let locationError: { message?: string } | null = null;

  {
    const response = await supabase
      .from('locations')
      .select('id, name, address, city, code, pricing_mode, flat_rate_amount, fixed_rate_amount, fixed_rate_interval_minutes, first_period_minutes, first_period_rate, succeeding_rate_amount, succeeding_rate_interval_minutes, entry_grace_minutes, exit_grace_minutes, reservation_fee_30_minutes, reservation_fee_60_minutes, reservation_fee_120_minutes')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    locations = (response.data as LiveLocationRow[] | null) ?? null;
    locationError = response.error;
  }

  if (locationError && isMissingPricingColumnError(locationError.message)) {
    const response = await supabase
      .from('locations')
      .select('id, name, address, city, code, pricing_mode, flat_rate_amount, fixed_hourly_rate, first_period_hours, first_period_rate, succeeding_hourly_rate, entry_grace_minutes, exit_grace_minutes, reservation_fee_30_minutes, reservation_fee_60_minutes, reservation_fee_120_minutes')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    locations = (response.data as LiveLocationRow[] | null) ?? null;
    locationError = response.error;
  }

  if (locationError || !locations || locations.length === 0) {
    if (locationError) {
      throw new Error(locationError.message ?? 'Unable to load parking locations.');
    }

    return {
      lots: [],
      isLiveData: true,
      mode: 'live',
    };
  }

  const liveLocations = locations;
  const locationIds = liveLocations.map((location) => location.id);
  let slotRows: LiveSlotRow[] | null = null;
  let slotError: { message?: string } | null = null;
  const { data: initialSlotRows, error: initialSlotError } = await supabase
    .from('parking_slots')
    .select('id, location_id, slot_label, status, display_order, qr_token, slot_kind')
    .in('location_id', locationIds)
    .order('display_order', { ascending: true });

  slotRows = (initialSlotRows as LiveSlotRow[] | null) ?? null;
  slotError = initialSlotError;

  if (slotError && isMissingSlotKindColumnError(slotError.message)) {
    const fallbackSlotResponse = await supabase
      .from('parking_slots')
      .select('id, location_id, slot_label, status, display_order, qr_token')
      .in('location_id', locationIds)
      .order('display_order', { ascending: true });

    slotRows = (fallbackSlotResponse.data as LiveSlotRow[] | null) ?? null;
    slotError = fallbackSlotResponse.error;
  }

  const { data: layoutRows, error: layoutError } = await supabase
    .from('parking_lot_layouts')
    .select('location_id, layout')
    .in('location_id', locationIds);

  if (slotError) {
    throw new Error(slotError.message ?? 'Unable to load parking slots.');
  }

  if (layoutError) {
    throw new Error(layoutError.message ?? 'Unable to load parking layouts.');
  }

  const slotsByLocation = new Map<string, LiveSlotRow[]>();
  ((slotRows ?? []) as Array<LiveSlotRow & { location_id: string }>)
    .filter((slot) => (slot.slot_kind ?? 'standard') === 'standard')
    .forEach((slot) => {
    const current = slotsByLocation.get(slot.location_id);
    if (current) {
      current.push(slot);
      return;
    }

    slotsByLocation.set(slot.location_id, [slot]);
    });

  const layoutsByLocation = new Map(
    ((layoutRows ?? []) as LiveLayoutRow[]).map((layout) => [layout.location_id, layout] as const),
  );
  const lots: ParkingLot[] = [];

  for (const location of liveLocations) {
    const liveSlots = slotsByLocation.get(location.id) ?? [];
    const parsedLayout = parseLotLayout(layoutsByLocation.get(location.id)?.layout);
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
    mode: 'live',
  };
}

export async function loadParkingLotById(lotId: string) {
  const { lots } = await loadParkingLots();
  return lots.find((lot) => lot.id === lotId) ?? null;
}
