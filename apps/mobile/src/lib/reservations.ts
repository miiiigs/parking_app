import { calculateBill, createExitCode, createReceiptNumber, createReservationCode, createTransactionId, createWalkInCode } from '../features/parking/lib/flow';
import { ensureMobileAuthSession, getCurrentGuestMode, getSupabaseClient } from './supabaseClient';
import type { Booking, CompletedSession, ParkingLot, ParkingSession, ParkingSlot } from '../features/parking/types';
import {
  DEFAULT_PARKING_PRICING,
  DEFAULT_RESERVATION_PRICING,
  getReservationFeeForWindow,
  normalizeParkingPricingConfig,
  normalizeReservationPricingConfig,
  type ParkingPricingConfig,
} from '@parking/shared';

export type ReservationResult = {
  reservation_id: string;
  slot_id: string;
  slot_label: string;
  slot_status: string;
  reservation_status: string;
  source?: string | null;
  reserved_at: string;
  expires_at: string;
  arrival_window_minutes?: number | null;
  plate_number?: string | null;
  reservation_fee?: number | null;
  parking_rate?: number | null;
  pricing_config?: ParkingPricingConfig | null;
};

export type ParkingSessionResult = {
  session_id: string;
  reservation_id: string;
  slot_id: string;
  slot_label: string;
  slot_status: string;
  reservation_status: string;
  source?: string | null;
  session_status: string;
  started_at: string;
  entry_confirmed_at?: string | null;
  parking_grace_ends_at?: string | null;
  metered_started_at?: string | null;
  validated_at: string;
  ended_at: string | null;
  plate_number: string;
  reservation_fee: number;
  billed_minutes: number | null;
  billed_amount: number | null;
  payment_status: string | null;
  pricing_config?: ParkingPricingConfig | null;
};

export type MobileWorkflowState = {
  reservation: ReservationResult;
  session: ParkingSessionResult | null;
};

export type ReservationRequest = {
  lot: ParkingLot;
  slot: ParkingSlot;
  arrivalWindowMinutes: number;
  plateNumber: string;
};

export type WalkInEntryPassRequest = {
  lot: ParkingLot;
  slot: ParkingSlot;
  plateNumber: string;
  holdMinutes?: number;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isMissingCancelReservationSignature(message: string | undefined) {
  if (!message) {
    return false;
  }

  return message.includes('Could not find the function public.cancel_parking_reservation');
}

async function shouldUseLocalFlow() {
  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    return true;
  }

  return getCurrentGuestMode();
}

function isMissingReserveParkingRateSignature(message: string | undefined) {
  if (!message) {
    return false;
  }

  return (
    message.includes('Could not find the function public.reserve_parking_slot') &&
    message.includes('p_parking_rate')
  );
}

function isMissingParkingRateColumn(message: string | undefined) {
  if (!message) {
    return false;
  }

  return message.toLowerCase().includes("column 'parking_rate' does not exist")
    || message.toLowerCase().includes('column "parking_rate" does not exist');
}

function isMissingPricingConfigColumn(message: string | undefined) {
  if (!message) {
    return false;
  }

  return message.toLowerCase().includes("column 'pricing_config' does not exist")
    || message.toLowerCase().includes('column "pricing_config" does not exist');
}

function isMissingSessionGraceColumn(message: string | undefined) {
  const normalized = message?.toLowerCase() ?? '';
  return normalized.includes('entry_confirmed_at')
    || normalized.includes('parking_grace_ends_at')
    || normalized.includes('metered_started_at');
}

function isMissingReservationSourceColumn(message: string | undefined) {
  if (!message) {
    return false;
  }

  return message.toLowerCase().includes("column 'source' does not exist")
    || message.toLowerCase().includes('column "source" does not exist');
}

function isMissingIssueWalkInEntryPassSignature(message: string | undefined) {
  if (!message) {
    return false;
  }

  return message.includes('Could not find the function public.issue_walk_in_entry_pass');
}

function buildExitGraceEndsAt(endTime: string, pricingConfig: ParkingPricingConfig) {
  const durationMs = Math.max(0, pricingConfig.exitGraceMinutes) * 60 * 1000;
  return new Date(new Date(endTime).getTime() + durationMs).toISOString();
}

function toBookingFromReservation({
  lot,
  slot,
  request,
  reservationId,
  expiresAt,
  reservationStatus,
  parkingRate,
  reservationFee,
  pricingConfig,
  source,
}: {
  lot: ParkingLot;
  slot: ParkingSlot;
  request: ReservationRequest;
  reservationId?: string | null;
  expiresAt?: string | null;
  reservationStatus?: string;
  parkingRate?: number | null;
  reservationFee?: number | null;
  pricingConfig?: ParkingPricingConfig | null;
  source?: 'reservation' | 'walk_in' | 'local';
}): Booking {
  const normalizedPricingConfig = normalizeParkingPricingConfig(
    pricingConfig ?? {
      fixedRateAmount: parkingRate ?? lot.pricePerHour,
      flatRateAmount: parkingRate ?? lot.pricePerHour,
      fixedRateIntervalMinutes: 60,
      firstPeriodMinutes: 180,
      firstPeriodRate: parkingRate ?? lot.pricePerHour,
      succeedingRateAmount: 20,
      succeedingRateIntervalMinutes: 60,
    },
  );

  return {
    reservationId: reservationId ?? undefined,
    reservationCode: reservationId ?? createReservationCode(slot.id),
    source: source ?? (reservationId ? 'reservation' : 'local'),
    lotId: lot.id,
    lotName: lot.name,
    address: lot.address,
    slotId: slot.id,
    slotLabel: slot.number,
    slot,
    arrivalWindowMinutes: request.arrivalWindowMinutes,
    plateNumber: request.plateNumber,
    reservationFee: reservationFee ?? getReservationFeeForWindow(request.arrivalWindowMinutes, lot.reservationPricing ?? DEFAULT_RESERVATION_PRICING),
    pricePerHour: parkingRate ?? lot.pricePerHour,
    pricingConfig: normalizedPricingConfig,
    reservationStatus: reservationStatus ?? (reservationId ? 'confirmed' : 'local'),
    expiresAt: expiresAt ?? null,
    qrToken: slot.qrToken ?? null,
    createdAt: new Date().toISOString(),
  };
}

function toLocalWalkInBooking({
  lot,
  slot,
  plateNumber,
  holdMinutes = 10,
}: WalkInEntryPassRequest): Booking {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();

  return {
    reservationCode: createWalkInCode(slot.id),
    source: 'walk_in',
    lotId: lot.id,
    lotName: lot.name,
    address: lot.address,
    slotId: slot.id,
    slotLabel: slot.number,
    slot,
    arrivalWindowMinutes: holdMinutes,
    plateNumber,
    reservationFee: 0,
    pricePerHour: lot.pricePerHour,
    pricingConfig: normalizeParkingPricingConfig(lot.pricingConfig ?? DEFAULT_PARKING_PRICING),
    reservationStatus: 'confirmed',
    expiresAt,
    qrToken: slot.qrToken ?? null,
    createdAt,
  };
}

export async function createParkingReservation(request: ReservationRequest) {
  const supabase = getSupabaseClient() as any;
  const useLocalFlow = await shouldUseLocalFlow();

  if (!supabase || useLocalFlow) {
    return toBookingFromReservation({ lot: request.lot, slot: request.slot, request });
  }

  if (!isUuidLike(request.slot.id)) {
    throw new Error('Live parking data is required for reservations. Reload the lot map or switch to guest mode for local testing.');
  }

  try {
    await ensureMobileAuthSession();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Sign in is required before you can reserve parking.');
  }

  let { data, error } = await supabase.rpc('reserve_parking_slot', {
    p_slot_id: request.slot.id,
    p_plate_number: request.plateNumber,
    p_arrival_window_minutes: request.arrivalWindowMinutes,
    p_parking_rate: request.lot.pricePerHour,
  });

  if (error && isMissingReserveParkingRateSignature(error.message)) {
    const fallbackResult = await supabase.rpc('reserve_parking_slot', {
      p_slot_id: request.slot.id,
      p_plate_number: request.plateNumber,
      p_arrival_window_minutes: request.arrivalWindowMinutes,
    });

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to create the reservation in Supabase.');
  }

  const reservation = Array.isArray(data) ? data[0] ?? null : data;

  if (!reservation) {
    throw new Error('Supabase did not return a reservation row.');
  }

  return toBookingFromReservation({
    lot: request.lot,
    slot: request.slot,
    request,
    reservationId: reservation.reservation_id,
    expiresAt: reservation.expires_at,
    reservationStatus: reservation.reservation_status,
    parkingRate: reservation.parking_rate,
    reservationFee: reservation.reservation_fee,
    pricingConfig: reservation.pricing_config ?? request.lot.pricingConfig,
    source: reservation.source === 'walk_in' ? 'walk_in' : 'reservation',
  });
}

export async function issueWalkInEntryPass(request: WalkInEntryPassRequest) {
  const supabase = getSupabaseClient() as any;
  const useLocalFlow = await shouldUseLocalFlow();
  const holdMinutes = request.holdMinutes ?? 10;

  if (!supabase || useLocalFlow) {
    return toLocalWalkInBooking({ ...request, holdMinutes });
  }

  if (!isUuidLike(request.slot.id)) {
    throw new Error('Live parking data is required for walk-in entry passes. Reload the lot map or switch to guest mode for local testing.');
  }

  try {
    await ensureMobileAuthSession();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Sign in is required before you can issue a walk-in entry pass.');
  }

  let { data, error } = await supabase.rpc('issue_walk_in_entry_pass', {
    p_slot_id: request.slot.id,
    p_plate_number: request.plateNumber,
    p_hold_minutes: holdMinutes,
  });

  if (error && isMissingIssueWalkInEntryPassSignature(error.message)) {
    return toLocalWalkInBooking({ ...request, holdMinutes });
  }

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to issue the walk-in entry pass in Supabase.');
  }

  const reservation = Array.isArray(data) ? data[0] ?? null : data;

  if (!reservation) {
    throw new Error('Supabase did not return a walk-in entry pass row.');
  }

  return toBookingFromReservation({
    lot: request.lot,
    slot: request.slot,
    request: {
      lot: request.lot,
      slot: request.slot,
      arrivalWindowMinutes: reservation.arrival_window_minutes ?? holdMinutes,
      plateNumber: request.plateNumber,
    },
    reservationId: reservation.reservation_id,
    expiresAt: reservation.expires_at,
    reservationStatus: reservation.reservation_status,
    parkingRate: reservation.parking_rate,
    reservationFee: reservation.reservation_fee,
    pricingConfig: reservation.pricing_config ?? request.lot.pricingConfig,
    source: 'walk_in',
  });
}

export async function getParkingReservationById(reservationId: string) {
  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    return null;
  }

  let query = supabase
    .from('reservations')
    .select(`
      id,
      slot_id,
      status,
      reserved_at,
      expires_at,
      arrival_window_minutes,
      plate_number,
      source,
      reservation_fee,
      parking_rate,
      pricing_config,
      parking_slots!inner (
        slot_label,
        status
      )
    `)
    .eq('id', reservationId)
    .maybeSingle();

  let { data, error } = await query;

  if (error && (isMissingParkingRateColumn(error.message) || isMissingPricingConfigColumn(error.message) || isMissingReservationSourceColumn(error.message))) {
    query = supabase
      .from('reservations')
      .select(`
        id,
        slot_id,
        status,
        reserved_at,
        expires_at,
        plate_number,
        reservation_fee,
        parking_slots!inner (
          slot_label,
          status
        )
      `)
      .eq('id', reservationId)
      .maybeSingle();

    ({ data, error } = await query);
  }

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const parkingSlot = Array.isArray(data.parking_slots) ? data.parking_slots[0] : data.parking_slots;

  return {
    reservation_id: data.id,
    slot_id: data.slot_id,
    slot_label: parkingSlot?.slot_label ?? 'Assigned slot',
    slot_status: parkingSlot?.status ?? 'available',
    reservation_status: data.status,
    source: 'source' in data ? data.source ?? null : null,
    reserved_at: data.reserved_at,
    expires_at: data.expires_at,
    arrival_window_minutes: data.arrival_window_minutes ?? null,
    plate_number: data.plate_number ?? null,
    reservation_fee: 'reservation_fee' in data && data.reservation_fee !== null && data.reservation_fee !== undefined ? Number(data.reservation_fee) : null,
    parking_rate: 'parking_rate' in data && data.parking_rate !== null && data.parking_rate !== undefined ? Number(data.parking_rate) : null,
    pricing_config: 'pricing_config' in data ? normalizeParkingPricingConfig(data.pricing_config ?? null) : null,
  } as ReservationResult;
}

export async function getParkingSessionByReservationId(reservationId: string) {
  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    return null;
  }

  let query = supabase
    .from('parking_sessions')
    .select(`
      id,
      reservation_id,
      slot_id,
      started_at,
      entry_confirmed_at,
      parking_grace_ends_at,
      metered_started_at,
      ended_at,
      billed_minutes,
      billed_amount,
      status,
        reservations!inner (
          plate_number,
          reservation_fee,
          source,
          pricing_config,
          status,
        parking_slots!inner (
          slot_label,
          status
        )
      )
    `)
    .eq('reservation_id', reservationId)
    .maybeSingle();

  let { data, error } = await query;

  if (error && (isMissingPricingConfigColumn(error.message) || isMissingReservationSourceColumn(error.message) || isMissingSessionGraceColumn(error.message))) {
    query = supabase
      .from('parking_sessions')
      .select(`
        id,
        reservation_id,
        slot_id,
        started_at,
        ended_at,
        billed_minutes,
        billed_amount,
        status,
        reservations!inner (
          plate_number,
          reservation_fee,
          status,
          parking_slots!inner (
            slot_label,
            status
          )
        )
      `)
      .eq('reservation_id', reservationId)
      .maybeSingle();

    ({ data, error } = await query);
  }

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const reservation = Array.isArray(data.reservations) ? data.reservations[0] : data.reservations;
  const parkingSlot = Array.isArray(reservation?.parking_slots) ? reservation?.parking_slots[0] : reservation?.parking_slots;

  const { data: paymentRows } = await supabase
    .from('payments')
    .select('status')
    .eq('session_id', data.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const payment = Array.isArray(paymentRows) ? paymentRows[0] ?? null : paymentRows;

  return {
    session_id: data.id,
    reservation_id: data.reservation_id,
    slot_id: data.slot_id,
    slot_label: parkingSlot?.slot_label ?? 'Assigned slot',
    slot_status: parkingSlot?.status ?? 'occupied',
    reservation_status: reservation?.status ?? 'confirmed',
    source: 'source' in (reservation ?? {}) ? reservation?.source ?? null : null,
    session_status: data.status,
    started_at: data.started_at,
    entry_confirmed_at: 'entry_confirmed_at' in data ? data.entry_confirmed_at ?? data.started_at : data.started_at,
    parking_grace_ends_at: 'parking_grace_ends_at' in data ? data.parking_grace_ends_at ?? null : null,
    metered_started_at: 'metered_started_at' in data ? data.metered_started_at ?? null : null,
    validated_at: 'entry_confirmed_at' in data ? data.entry_confirmed_at ?? data.started_at : data.started_at,
    ended_at: data.ended_at ?? null,
    plate_number: reservation?.plate_number ?? '',
    reservation_fee: Number(reservation?.reservation_fee ?? 0),
    billed_minutes: data.billed_minutes ?? null,
    billed_amount: data.billed_amount !== null && data.billed_amount !== undefined ? Number(data.billed_amount) : null,
    payment_status: payment?.status ?? (data.status === 'completed' ? 'paid' : null),
    pricing_config: normalizeParkingPricingConfig(reservation?.pricing_config ?? null),
  } as ParkingSessionResult;
}

export async function getCurrentMobileWorkflowState(): Promise<MobileWorkflowState | null> {
  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    return null;
  }

  await ensureMobileAuthSession();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const currentUser = userData?.user ?? null;

  if (userError || !currentUser) {
    return null;
  }

  const { data: reservations, error } = await supabase
    .from('reservations')
    .select(`id`)
    .eq('user_id', currentUser.id)
    .eq('status', 'confirmed')
    .order('reserved_at', { ascending: false })
    .limit(10);

  if (error || !reservations || reservations.length === 0) {
    return null;
  }

  for (const reservationRow of reservations) {
    const latestReservation = await getParkingReservationById(reservationRow.id);

    if (!latestReservation) {
      continue;
    }

    const latestSession = await getParkingSessionByReservationId(latestReservation.reservation_id);

    if (latestSession?.session_status === 'completed') {
      continue;
    }

    if (latestSession) {
      return {
        reservation: latestReservation,
        session: latestSession,
      };
    }

    const expiresAtMs = new Date(latestReservation.expires_at).getTime();
    if (Number.isFinite(expiresAtMs) && expiresAtMs > Date.now()) {
      return {
        reservation: latestReservation,
        session: null,
      };
    }
  }

  return null;
}

export async function cancelParkingReservation(request: { reservationId: string }) {
  const supabase = getSupabaseClient() as any;
  const useLocalFlow = await shouldUseLocalFlow();

  if (!supabase || useLocalFlow) {
    return null;
  }

  try {
    await ensureMobileAuthSession();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Sign in is required before you can cancel a reservation.');
  }

  let { data, error } = await supabase.rpc('cancel_parking_reservation', {
    p_reservation_id: request.reservationId,
  });

  if (error && isMissingCancelReservationSignature(error.message)) {
    const fallback = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.reservationId)
      .select('id')
      .maybeSingle();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function endParkingSession(request: {
  reservationId: string;
  billedAmount?: number | null;
  billedMinutes?: number | null;
}) {
  const supabase = getSupabaseClient() as any;
  const useLocalFlow = await shouldUseLocalFlow();

  if (!supabase || useLocalFlow) {
    return null;
  }

  try {
    await ensureMobileAuthSession();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Sign in is required before you can end a parking session.');
  }

  const { data, error } = await supabase.rpc('end_parking_session', {
    p_reservation_id: request.reservationId,
    p_billed_minutes: request.billedMinutes ?? null,
    p_billed_amount: request.billedAmount ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as ParkingSessionResult[];
}

export function mapReservationToBooking(
  reservation: ReservationResult,
  lot: ParkingLot,
  slot: ParkingSlot,
): Booking {
  return {
    reservationId: reservation.reservation_id,
    reservationCode: reservation.reservation_id,
    source: reservation.source === 'walk_in' ? 'walk_in' : 'reservation',
    lotId: lot.id,
    lotName: lot.name,
    address: lot.address,
    slotId: reservation.slot_id,
    slotLabel: reservation.slot_label,
    slot,
    arrivalWindowMinutes: reservation.arrival_window_minutes ?? 0,
    plateNumber: reservation.plate_number ?? '',
    reservationFee: reservation.reservation_fee ?? getReservationFeeForWindow(reservation.arrival_window_minutes ?? 60, lot.reservationPricing ?? DEFAULT_RESERVATION_PRICING),
    pricePerHour: reservation.parking_rate ?? lot.pricePerHour,
    pricingConfig: normalizeParkingPricingConfig(reservation.pricing_config ?? lot.pricingConfig ?? DEFAULT_PARKING_PRICING),
    reservationStatus: reservation.reservation_status,
    expiresAt: reservation.expires_at,
    qrToken: slot.qrToken ?? null,
    createdAt: reservation.reserved_at,
  };
}

export function mapSessionToParkingSession(
  session: ParkingSessionResult,
  booking: Booking,
): ParkingSession {
  return {
    ...booking,
    sessionId: session.session_id,
    sessionStatus: session.session_status,
    startTime: session.started_at,
    startedAt: session.started_at,
    validatedAt: session.validated_at,
    parkingGraceEndsAt: session.parking_grace_ends_at ?? null,
    meteredStartedAt: session.metered_started_at ?? null,
    billedMinutes: session.billed_minutes,
    billedAmount: session.billed_amount,
    paymentStatus: session.payment_status,
    source: session.source === 'walk_in' ? 'walk_in' : booking.source,
    pricingConfig: normalizeParkingPricingConfig(session.pricing_config ?? booking.pricingConfig),
  };
}

export function mapCompletedSession(
  session: ParkingSessionResult,
  booking: Booking,
): CompletedSession {
  const durationSeconds = Math.max(0, Math.floor((new Date(session.ended_at ?? session.started_at).getTime() - new Date(session.started_at).getTime()) / 1000));
  const totalBill = session.billed_amount ?? calculateBill(durationSeconds, booking.pricingConfig);
  const pricingConfig = normalizeParkingPricingConfig(session.pricing_config ?? booking.pricingConfig);
  const endTime = session.ended_at ?? new Date().toISOString();

  return {
    ...mapSessionToParkingSession(session, booking),
    endTime,
    durationSeconds,
    totalBill,
    receiptNumber: createReceiptNumber(),
    transactionId: createTransactionId(),
    exitCode: createExitCode(booking.slot.id),
    exitGraceEndsAt: buildExitGraceEndsAt(endTime, pricingConfig),
  };
}
