import { getAdminSupabaseConfig } from './supabase';

export type AdminLocation = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
};

export type AdminSlot = {
  id: string;
  slotLabel: string;
  status: 'available' | 'reserved' | 'occupied' | 'blocked';
  displayOrder: number;
  qrToken: string;
};

export type AdminMetrics = {
  activeReservations: number;
  occupiedSlots: number;
  completedSessions: number;
  noShowsToday: number;
  revenue: number;
};

export type AdminReservation = {
  id: string;
  slotId: string;
  slotLabel: string;
  plateNumber: string;
  status: 'pending' | 'confirmed' | 'completed' | 'expired' | 'cancelled' | 'no_show';
  arrivalWindowMinutes: number;
  reservationFee: number;
  reservedAt: string;
  expiresAt: string;
};

export type AdminDashboardData = {
  location: AdminLocation | null;
  slots: AdminSlot[];
  reservations: AdminReservation[];
  metrics: AdminMetrics;
};

type SupabaseListResponse<T> = T[];
type SlotSourceStatus = 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';

const fallbackLocation: AdminLocation = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'BGC Pilot Site',
  code: 'bgc-pilot',
  address: 'Bonifacio Global City, Taguig',
  city: 'Bonifacio Global City',
};

function createFallbackSlots(): AdminSlot[] {
  return Array.from({ length: 20 }, (_, index) => {
    const slotNumber = index + 1;

    return {
      id: `fallback-slot-${slotNumber}`,
      slotLabel: `Slot #${slotNumber}`,
      status: slotNumber === 12 ? 'reserved' : 'available',
      displayOrder: slotNumber,
      qrToken: `bgc-pilot-slot-${slotNumber}`,
    };
  });
}

function createFallbackReservations(): AdminReservation[] {
  return [
    {
      id: 'fallback-reservation-1',
      slotId: 'fallback-slot-12',
      slotLabel: 'Slot #12',
      plateNumber: 'ABC-1234',
      status: 'confirmed',
      arrivalWindowMinutes: 60,
      reservationFee: 40,
      reservedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  ];
}

function normalizeSlotStatus({
  rawStatus,
  hasActiveSession,
  hasConfirmedReservation,
}: {
  rawStatus: SlotSourceStatus;
  hasActiveSession: boolean;
  hasConfirmedReservation: boolean;
}): AdminSlot['status'] {
  if (hasActiveSession) {
    return 'occupied';
  }

  if (hasConfirmedReservation) {
    return 'reserved';
  }

  if (rawStatus === 'blocked' || rawStatus === 'disputed') {
    return 'blocked';
  }

  return 'available';
}

export function getFallbackAdminDashboardData(): AdminDashboardData {
  const slots = createFallbackSlots();
  const reservations = createFallbackReservations();

  return {
    location: fallbackLocation,
    slots,
    reservations,
    metrics: {
      activeReservations: 1,
      occupiedSlots: 0,
        completedSessions: 0,
      noShowsToday: 0,
      revenue: 0,
    },
  };
}

export async function loadAdminDashboardData(): Promise<AdminDashboardData> {
  const config = getAdminSupabaseConfig();

  if (!config) {
    return getFallbackAdminDashboardData();
  }

  const headers = {
    apikey: config.anonKey ?? config.serviceRoleKey ?? '',
    Authorization: `Bearer ${config.serviceRoleKey ?? config.anonKey ?? ''}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const locationResponse = await fetch(
    `${config.url}/rest/v1/locations?select=id,name,code,address,city,is_active,created_at&is_active=eq.true&order=created_at.asc&limit=1`,
    {
      headers,
      cache: 'no-store',
    },
  );

  const locationRows = (await locationResponse.json()) as SupabaseListResponse<AdminLocation>;
  const location = locationRows[0] ?? fallbackLocation;

  const slotResponse = await fetch(
    `${config.url}/rest/v1/parking_slots?select=id,slot_label,status,display_order,qr_token,location_id&location_id=eq.${location.id}&order=display_order.asc`,
    {
      headers,
      cache: 'no-store',
    },
  );

  const slotRows = (await slotResponse.json()) as SupabaseListResponse<{
    id: string;
    slot_label: string;
    status: SlotSourceStatus;
    display_order: number;
    qr_token: string;
  }>;

  const reservationResponse = await fetch(
    `${config.url}/rest/v1/reservations?select=id,slot_id,plate_number,status,arrival_window_minutes,reservation_fee,reserved_at,expires_at&status=in.(confirmed)&order=reserved_at.desc&limit=20`,
    {
      headers,
      cache: 'no-store',
    },
  );

  const reservationRows = (await reservationResponse.json()) as SupabaseListResponse<{
    id: string;
    slot_id: string;
    plate_number: string;
    status: AdminReservation['status'];
    arrival_window_minutes: number;
    reservation_fee: number;
    reserved_at: string;
    expires_at: string;
  }>;

  const sessionResponse = await fetch(
    `${config.url}/rest/v1/parking_sessions?select=status,billed_amount,slot_id&status=in.(active,completed)&order=started_at.desc`,
    {
      headers,
      cache: 'no-store',
    },
  );

  const sessionRows = (await sessionResponse.json()) as SupabaseListResponse<{
    status: string;
    billed_amount: number | null;
    slot_id: string;
  }>;

  const activeSessionRows = sessionRows.filter((session) => session.status === 'active');
  const completedSessionCount = sessionRows.filter((session) => session.status === 'completed').length;

  const paymentResponse = await fetch(
    `${config.url}/rest/v1/payments?select=amount,status&status=eq.paid&order=paid_at.desc`,
    {
      headers,
      cache: 'no-store',
    },
  );

  const paymentRows = (await paymentResponse.json()) as SupabaseListResponse<{
    amount: number;
    status: 'paid';
  }>;

  const activeSessionSlotIds = new Set(activeSessionRows.map((session) => session.slot_id));
  const confirmedReservationSlotIds = new Set(reservationRows.map((reservation) => reservation.slot_id));

  const slots =
    slotRows?.map((slot) => ({
      id: slot.id,
      slotLabel: slot.slot_label,
      status: normalizeSlotStatus({
        rawStatus: slot.status,
        hasActiveSession: activeSessionSlotIds.has(slot.id),
        hasConfirmedReservation: confirmedReservationSlotIds.has(slot.id),
      }),
      displayOrder: slot.display_order,
      qrToken: slot.qr_token,
    })) ?? createFallbackSlots();

  const slotLabelMap = new Map(slots.map((slot) => [slot.id, slot.slotLabel]));

  const reservations =
    reservationRows?.map((reservation) => ({
      id: reservation.id,
      slotId: reservation.slot_id,
      slotLabel: slotLabelMap.get(reservation.slot_id) ?? 'Unknown slot',
      plateNumber: reservation.plate_number,
      status: reservation.status,
      arrivalWindowMinutes: reservation.arrival_window_minutes,
      reservationFee: Number(reservation.reservation_fee ?? 0),
      reservedAt: reservation.reserved_at,
      expiresAt: reservation.expires_at,
    })) ?? createFallbackReservations();

  const activeReservations = reservations.filter((reservation) => reservation.status === 'confirmed').length;
  const occupiedSlots = activeSessionSlotIds.size;
  const noShowsToday = reservations.filter((reservation) => reservation.status === 'no_show').length;
  const revenue = paymentRows.reduce((total, payment) => total + Number(payment.amount ?? 0), 0);

  return {
    location,
    slots,
    reservations,
    metrics: {
      activeReservations,
      occupiedSlots,
        completedSessions: completedSessionCount,
      noShowsToday,
      revenue,
    },
  };
}