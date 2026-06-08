import { getAdminSupabaseConfig } from './supabase';
import { resolveAdminLocationContext } from './adminLocationServer';

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
  dataIntegrityMismatches: number;
};

export type AdminAuditEvent = {
  id: string;
  tableName: string;
  recordId: string | null;
  action: 'insert' | 'update' | 'delete' | 'reconcile_fix' | 'manual_override';
  actorUserId: string | null;
  createdAt: string;
};

export type ReconciliationRun = {
  id: string;
  runStatus: 'running' | 'completed' | 'failed';
  mismatchCount: number;
  fixedCount: number;
  message: string | null;
  startedAt: string;
  completedAt: string | null;
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
  auditEvents: AdminAuditEvent[];
  reconciliationRuns: ReconciliationRun[];
};

type SupabaseListResponse<T> = T[];
type SlotSourceStatus = 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';

async function readRestList<T>(response: Response): Promise<SupabaseListResponse<T>> {
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload as SupabaseListResponse<T>;
}

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

function createFallbackAuditEvents(): AdminAuditEvent[] {
  return [];
}

function createFallbackReconciliationRuns(): ReconciliationRun[] {
  return [];
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
      dataIntegrityMismatches: 0,
    },
    auditEvents: createFallbackAuditEvents(),
    reconciliationRuns: createFallbackReconciliationRuns(),
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

  const locationContext = await resolveAdminLocationContext();
  const location = (locationContext.activeLocation ?? fallbackLocation) as AdminLocation;

  const slotResponse = await fetch(
    `${config.url}/rest/v1/parking_slots?select=id,slot_label,status,display_order,qr_token,location_id&location_id=eq.${location.id}&order=display_order.asc`,
    {
      headers,
      cache: 'no-store',
    },
  );

  const slotRows = await readRestList<{
    id: string;
    slot_label: string;
    status: SlotSourceStatus;
    display_order: number;
    qr_token: string;
  }>(slotResponse);
  const slotIds = slotRows.map((slot) => slot.id);
  const slotIdFilter = slotIds.length > 0 ? slotIds.join(',') : null;

  const reservationRows = slotIdFilter
    ? await readRestList<{
    id: string;
    slot_id: string;
    plate_number: string;
    status: AdminReservation['status'];
    arrival_window_minutes: number;
    reservation_fee: number;
    reserved_at: string;
    expires_at: string;
      }>(
        await fetch(
          `${config.url}/rest/v1/reservations?select=id,slot_id,plate_number,status,arrival_window_minutes,reservation_fee,reserved_at,expires_at&slot_id=in.(${slotIdFilter})&order=reserved_at.desc&limit=20`,
          {
            headers,
            cache: 'no-store',
          },
        ),
      )
    : [];
  const reservationIds = reservationRows.map((reservation) => reservation.id);
  const reservationIdFilter = reservationIds.length > 0 ? reservationIds.join(',') : null;

  const sessionRows = slotIdFilter
    ? await readRestList<{
    status: string;
    billed_amount: number | null;
    slot_id: string;
      }>(
        await fetch(
          `${config.url}/rest/v1/parking_sessions?select=status,billed_amount,slot_id,reservation_id&slot_id=in.(${slotIdFilter})&status=in.(active,completed)&order=started_at.desc`,
          {
            headers,
            cache: 'no-store',
          },
        ),
      )
    : [];

  const activeSessionRows = sessionRows.filter((session) => session.status === 'active');
  const completedSessionCount = sessionRows.filter((session) => session.status === 'completed').length;

  const paymentRows = reservationIdFilter
    ? await readRestList<{
    amount: number;
    status: 'paid';
      }>(
        await fetch(
          `${config.url}/rest/v1/payments?select=amount,status,reservation_id&reservation_id=in.(${reservationIdFilter})&status=eq.paid&order=paid_at.desc`,
          {
            headers,
            cache: 'no-store',
          },
        ),
      )
    : [];

  const auditRows = await readRestList<{
    id: string;
    table_name: string;
    record_id: string | null;
    action: AdminAuditEvent['action'];
    actor_user_id: string | null;
    created_at: string;
  }>(
    await fetch(
      `${config.url}/rest/v1/admin_audit_log?select=id,table_name,record_id,action,actor_user_id,created_at&order=created_at.desc&limit=50`,
      {
        headers,
        cache: 'no-store',
      },
    ),
  );

  const reconciliationRows = await readRestList<{
    id: string;
    run_status: ReconciliationRun['runStatus'];
    mismatch_count: number;
    fixed_count: number;
    message: string | null;
    started_at: string;
    completed_at: string | null;
  }>(
    await fetch(
      `${config.url}/rest/v1/reconciliation_runs?select=id,run_status,mismatch_count,fixed_count,message,started_at,completed_at&order=started_at.desc&limit=5`,
      {
        headers,
        cache: 'no-store',
      },
    ),
  );

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
  const dataIntegrityMismatches = slotRows.filter((slot) => {
    const normalizedStatus = normalizeSlotStatus({
      rawStatus: slot.status,
      hasActiveSession: activeSessionSlotIds.has(slot.id),
      hasConfirmedReservation: confirmedReservationSlotIds.has(slot.id),
    });

    return normalizedStatus !== slot.status;
  }).length;

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
      dataIntegrityMismatches,
    },
    auditEvents: auditRows
      .filter((event) => {
        if (event.table_name === 'parking_slots' && event.record_id) {
          return slotIds.includes(event.record_id);
        }

        if (event.table_name === 'reservations' && event.record_id) {
          return reservationIds.includes(event.record_id);
        }

        return false;
      })
      .map((event) => ({
        id: event.id,
        tableName: event.table_name,
        recordId: event.record_id,
        action: event.action,
        actorUserId: event.actor_user_id,
        createdAt: event.created_at,
      })),
    reconciliationRuns: reconciliationRows.map((run) => ({
      id: run.id,
      runStatus: run.run_status,
      mismatchCount: run.mismatch_count,
      fixedCount: run.fixed_count,
      message: run.message,
      startedAt: run.started_at,
      completedAt: run.completed_at,
    })),
  };
}
