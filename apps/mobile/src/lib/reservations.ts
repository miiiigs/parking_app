import { getSupabaseClient } from './supabaseClient';
import { getArrivalWindowOption } from './reservationOptions';

export type ReservationResult = {
  reservation_id: string;
  slot_id: string;
  slot_label: string;
  slot_status: string;
  reservation_status: string;
  reserved_at: string;
  expires_at: string;
};

export type ParkingSessionResult = {
  session_id: string;
  reservation_id: string;
  slot_id: string;
  slot_label: string;
  slot_status: string;
  reservation_status: string;
  session_status: string;
  started_at: string;
  validated_at: string;
  ended_at: string | null;
  plate_number: string;
  reservation_fee: number;
  billed_minutes: number | null;
  billed_amount: number | null;
  payment_status: string | null;
};

export type ReservationRequest = {
  slotId: string;
  arrivalWindowMinutes: number;
  plateNumber: string;
};

function generateGuestUserId() {
  const randomSegment = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);

  return `${randomSegment()}${randomSegment()}-${randomSegment()}-${randomSegment()}-${randomSegment()}-${randomSegment()}${randomSegment()}${randomSegment()}`;
}

export async function createParkingReservation(request: ReservationRequest) {
  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const selectedWindow = getArrivalWindowOption(request.arrivalWindowMinutes);

  const { data, error } = await supabase.rpc('reserve_parking_slot', {
    p_slot_id: request.slotId,
    p_user_id: generateGuestUserId(),
    p_plate_number: request.plateNumber,
    p_arrival_window_minutes: request.arrivalWindowMinutes,
    p_reservation_fee: selectedWindow.fee,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as ReservationResult[];
}

export async function getParkingReservationById(reservationId: string) {
  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('reservations')
    .select(`
      id,
      slot_id,
      status,
      reserved_at,
      expires_at,
      parking_slots!inner (
        slot_label,
        status
      )
    `)
    .eq('id', reservationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const parkingSlot = Array.isArray(data.parking_slots) ? data.parking_slots[0] : data.parking_slots;

  return {
    reservation_id: data.id,
    slot_id: data.slot_id,
    slot_label: parkingSlot?.slot_label ?? 'Assigned slot',
    slot_status: parkingSlot?.status ?? 'available',
    reservation_status: data.status,
    reserved_at: data.reserved_at,
    expires_at: data.expires_at,
  } as ReservationResult;
}

export async function getParkingSessionByReservationId(reservationId: string) {
  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
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

  if (error || !data) {
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
    session_status: data.status,
    started_at: data.started_at,
    validated_at: data.started_at,
    ended_at: data.ended_at ?? null,
    plate_number: reservation?.plate_number ?? '',
    reservation_fee: Number(reservation?.reservation_fee ?? 0),
    billed_minutes: data.billed_minutes ?? null,
    billed_amount: data.billed_amount !== null && data.billed_amount !== undefined ? Number(data.billed_amount) : null,
    payment_status: payment?.status ?? (data.status === 'completed' ? 'paid' : null),
  } as ParkingSessionResult;
}

export async function endParkingSession(request: {
  reservationId: string;
  billedAmount?: number | null;
  billedMinutes?: number | null;
}) {
  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
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

export async function startParkingSession(request: {
  reservationId: string;
  slotQrToken?: string | null;
}) {
  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.rpc('start_parking_session', {
    p_reservation_id: request.reservationId,
    p_slot_qr_token: request.slotQrToken ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as ParkingSessionResult[];
}