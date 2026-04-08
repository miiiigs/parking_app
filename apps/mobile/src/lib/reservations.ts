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
  plate_number: string;
  reservation_fee: number;
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
  const supabase = getSupabaseClient();

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

export async function startParkingSession(request: {
  reservationId: string;
  slotQrToken?: string | null;
}) {
  const supabase = getSupabaseClient();

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