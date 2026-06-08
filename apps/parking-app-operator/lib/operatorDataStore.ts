import type { RealtimeChannel } from '@supabase/supabase-js';

import { getOperatorRealtimeClient } from './realtimeClient';
import type { ParkingSlotStatus } from './parkingMap';
import type {
  AuditLog,
  OperatorDashboardData,
  OperatorSystemHealth,
  ParkingSlot,
  Reservation,
} from './types';

type RealtimeRecord = Record<string, unknown>;

type RealtimePayload = {
  table?: string;
  eventType?: string;
  type?: string;
  event?: string;
  new?: RealtimeRecord | null;
  record?: RealtimeRecord | null;
  payload?: RealtimeRecord | null;
};

type OperatorStoreState = {
  data: OperatorDashboardData | null;
  loading: boolean;
};

let cachedData: OperatorDashboardData | null = null;
let loading = true;
let inFlightRefresh: Promise<OperatorDashboardData | null> | null = null;
let subscribers = new Set<(state: OperatorStoreState) => void>();
let pendingEvents: RealtimePayload[] = [];
let applyTimer: number | null = null;
let channel: RealtimeChannel | null = null;
let initialized = false;
let lastRefreshAt = 0;
let fallbackIntervalId: number | null = null;
let lastRealtimeEventAt = 0;
let failedActionCount = 0;
let realtimeStatus: OperatorSystemHealth['realtime'] = 'unknown';
let syncMode: OperatorSystemHealth['syncMode'] = 'realtime';

function toIsoTimestamp(value: number) {
  return value > 0 ? new Date(value).toISOString() : null;
}

function computeOverallHealth(health: OperatorSystemHealth): OperatorSystemHealth['overall'] {
  if (health.database === 'offline') {
    return 'offline';
  }

  if (health.database === 'degraded' || health.realtime === 'degraded' || health.realtime === 'offline' || health.failedActionCount > 0) {
    return 'degraded';
  }

  if (health.database === 'healthy' && (health.realtime === 'healthy' || health.realtime === 'unknown')) {
    return 'healthy';
  }

  return 'unknown';
}

function mergeSystemHealth(base?: OperatorSystemHealth | null): OperatorSystemHealth {
  const database = base?.backendReachable === false ? 'offline' : base?.database ?? 'unknown';
  const health: OperatorSystemHealth = {
    overall: 'unknown',
    database,
    realtime: syncMode === 'polling' ? 'degraded' : realtimeStatus,
    syncMode,
    backendReachable: base?.backendReachable ?? database !== 'offline',
    lastSuccessfulSyncAt: toIsoTimestamp(lastRefreshAt) ?? base?.lastSuccessfulSyncAt ?? null,
    lastDashboardRefreshAt: base?.lastDashboardRefreshAt ?? toIsoTimestamp(lastRefreshAt),
    lastRealtimeEventAt: toIsoTimestamp(lastRealtimeEventAt) ?? base?.lastRealtimeEventAt ?? null,
    failedActionCount,
  };
  health.overall = computeOverallHealth(health);
  return health;
}

function applyHealthToCachedData() {
  if (!cachedData) {
    return;
  }

  cachedData = {
    ...cachedData,
    systemHealth: mergeSystemHealth(cachedData.systemHealth),
  };
}

function notifyAll() {
  for (const cb of subscribers) cb({ data: cachedData, loading });
}

function normalizeOperatorSlotStatus(status: string): ParkingSlot['status'] {
  switch (status) {
    case 'occupied':
    case 'reserved':
    case 'available':
      return status;
    case 'blocked':
    case 'disputed':
    case 'maintenance':
    default:
      return 'maintenance';
  }
}

function normalizeLayoutSlotStatus(status: string): ParkingSlotStatus {
  switch (status) {
    case 'available':
    case 'reserved':
    case 'occupied':
    case 'blocked':
    case 'disputed':
      return status;
    case 'maintenance':
    default:
      return 'blocked';
  }
}

function readRecordString(record: RealtimeRecord | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' ? value : null;
}

function readRecordNumber(record: RealtimeRecord | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === 'number' ? value : null;
}

function recomputeMetrics(next: OperatorDashboardData) {
  const slotsList = next.parkingMap?.slots ?? [];
  const reservationsList = next.reservations ?? [];
  const activeReservations = reservationsList.filter((reservation) => reservation.status === 'active').length;
  const occupiedSlots = slotsList.filter((slot) => slot.status === 'occupied').length;
  const noShows = reservationsList.filter((reservation) => reservation.status === 'no-show').length;

  next.metrics = {
    ...(next.metrics || {}),
    activeReservations,
    occupiedSlots,
    noShows,
    occupancyRate: slotsList.length ? Math.round((occupiedSlots / slotsList.length) * 1000) / 10 : 0,
  };
}

async function doRefresh(options?: { silent?: boolean }) {
  const url = '/api/operator/dashboard';
  const shouldShowLoading = !options?.silent && cachedData === null;

  if (shouldShowLoading) {
    loading = true;
    notifyAll();
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (cachedData) {
        cachedData = {
          ...cachedData,
          systemHealth: {
            ...mergeSystemHealth(cachedData.systemHealth),
            database: 'offline',
            backendReachable: false,
            overall: 'offline',
          },
        };
      }
      return cachedData;
    }

    const payload = (await res.json().catch(() => null)) as OperatorDashboardData | null;
    if (payload) {
      lastRefreshAt = Date.now();
      cachedData = {
        ...payload,
        systemHealth: mergeSystemHealth(payload.systemHealth),
      };
    }

    return cachedData;
  } catch {
    if (cachedData) {
      cachedData = {
        ...cachedData,
        systemHealth: {
          ...mergeSystemHealth(cachedData.systemHealth),
          database: 'offline',
          backendReachable: false,
          overall: 'offline',
        },
      };
    }
    return cachedData;
  } finally {
    loading = false;
    notifyAll();
  }
}

export function subscribeOperatorData(cb: (state: OperatorStoreState) => void) {
  subscribers.add(cb);
  cb({ data: cachedData, loading });

  if (!initialized) {
    initialized = true;
    ensureRealtimeSubscribed();
    if (!inFlightRefresh) {
      inFlightRefresh = doRefresh().finally(() => (inFlightRefresh = null));
    }
  }

  return () => {
    subscribers.delete(cb);
  };
}

export async function refreshOperatorData(options?: { silent?: boolean }) {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = doRefresh(options).finally(() => (inFlightRefresh = null));
  return inFlightRefresh;
}

export function recordOperatorActionFailure() {
  failedActionCount += 1;
  applyHealthToCachedData();
  notifyAll();
}

export function recordOperatorActionSuccess() {
  if (failedActionCount === 0) {
    return;
  }

  failedActionCount = Math.max(0, failedActionCount - 1);
  applyHealthToCachedData();
  notifyAll();
}

export function applyOptimisticSlotStatus(slotId: string, status: string) {
  if (!cachedData?.parkingMap?.slots) {
    return;
  }

  const normalizedStatus = normalizeOperatorSlotStatus(status);
  const normalizedLayoutStatus = normalizeLayoutSlotStatus(status);
  const next: OperatorDashboardData = {
    ...cachedData,
    parkingMap: {
      ...cachedData.parkingMap,
      slots: cachedData.parkingMap.slots.map((slot) =>
        String(slot.id) === String(slotId) ? { ...slot, status: normalizedStatus } : slot,
      ),
      layout: cachedData.parkingMap.layout
        ? {
            ...cachedData.parkingMap.layout,
            slots: cachedData.parkingMap.layout.slots.map((slot) =>
              String(slot.id) === String(slotId) ? { ...slot, status: normalizedLayoutStatus } : slot,
            ),
          }
        : cachedData.parkingMap.layout,
    },
  };

  recomputeMetrics(next);
  cachedData = {
    ...next,
    systemHealth: mergeSystemHealth(next.systemHealth),
  };
  notifyAll();
}

function scheduleApplyEvents() {
  if (applyTimer) return;
  applyTimer = window.setTimeout(() => {
    applyTimer = null;
    const events = pendingEvents.splice(0, pendingEvents.length);
    if (!events.length || !cachedData) return;

    const next: OperatorDashboardData = { ...cachedData };

    for (const ev of events) {
      const table = ev.table ?? null;
      const eventType = ev.eventType ?? ev.type ?? ev.event ?? null;
      const record = (ev.new ?? ev.record ?? ev.payload ?? null) as RealtimeRecord | null;

      if (!table) continue;

      if (table === 'parking_slots') {
        const slots = [...next.parkingMap.slots];
        const id = readRecordString(record, 'id') ?? readRecordString(record, 'slot_id');
        const idx = slots.findIndex((slot) => String(slot.id) === String(id));
        const slotNumber =
          readRecordString(record, 'slot_label') ??
          readRecordString(record, 'label') ??
          (idx >= 0 ? slots[idx].slotNumber : undefined);
        const normalizedStatus = normalizeOperatorSlotStatus(readRecordString(record, 'status') ?? 'available');

        if (idx >= 0) {
          slots[idx] = {
            ...slots[idx],
            status: normalizedStatus,
            slotNumber: slotNumber ?? slots[idx].slotNumber,
          };
        } else if (record && id) {
          slots.push({
            id,
            slotNumber: slotNumber ?? `#${id}`,
            status: normalizedStatus,
            x: 0,
            y: 0,
            width: 92,
            height: 76,
            rotation: 0,
            vehicleType: 'standard',
          });
        }

        next.parkingMap = {
          ...next.parkingMap,
          slots,
          layout: next.parkingMap.layout
            ? {
                ...next.parkingMap.layout,
                slots: next.parkingMap.layout.slots.map((slot) =>
                  String(slot.id) === String(id)
                    ? {
                        ...slot,
                        id: id ?? slot.id,
                        label: slotNumber ?? slot.label,
                        status: normalizeLayoutSlotStatus(readRecordString(record, 'status') ?? slot.status ?? 'available'),
                      }
                    : slot,
                ),
              }
            : next.parkingMap.layout,
        };
      }

      if (table === 'reservations') {
        const reservations = [...next.reservations];
        const reservationId = readRecordString(record, 'id');
        const checkInTime = readRecordString(record, 'reserved_at');
        const checkOutTime = readRecordString(record, 'expires_at');
        const rawStatus = readRecordString(record, 'status');
        const status: Reservation['status'] =
          rawStatus === 'confirmed'
            ? 'active'
            : rawStatus === 'completed'
              ? 'completed'
              : rawStatus === 'no_show'
                ? 'no-show'
                : 'active';
        const slotId = readRecordString(record, 'slot_id') ?? '';
        const slotNumber = next.parkingMap.slots.find((slot) => String(slot.id) === String(slotId))?.slotNumber ?? 'Unknown';
        const updatedReservation: Reservation = {
          id: reservationId ?? crypto.randomUUID(),
          reservationId: `RES-${String(reservationId ?? '').slice(0, 8)}`,
          vehicleNumber: readRecordString(record, 'plate_number') ?? '',
          driverName: '',
          slotId,
          slotNumber,
          checkInTime,
          checkOutTime,
          duration:
            checkInTime && checkOutTime
              ? Math.round((new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) / 60000)
              : 0,
          status,
          amount: Number(readRecordNumber(record, 'reservation_fee') ?? 0),
          paymentStatus: 'completed',
          linkedSessionId: null,
        };

        if (eventType === 'INSERT') {
          reservations.unshift(updatedReservation);
        } else if (eventType === 'UPDATE') {
          const index = reservations.findIndex((reservation) => String(reservation.id) === String(reservationId));
          if (index >= 0) {
            reservations[index] = { ...reservations[index], ...updatedReservation };
          } else {
            reservations.unshift(updatedReservation);
          }
        } else if (eventType === 'DELETE') {
          next.reservations = reservations.filter((reservation) => String(reservation.id) !== String(reservationId));
        } else {
          const index = reservations.findIndex((reservation) => String(reservation.id) === String(reservationId));
          if (index >= 0) {
            reservations[index] = { ...reservations[index], ...updatedReservation };
          } else {
            reservations.unshift(updatedReservation);
          }
        }

        next.reservations = reservations;
      }

      if (table === 'operator_events') {
        const logs = [...next.auditLogs];
        const slotId = readRecordString(record, 'slot_id') ?? undefined;
        const slotNumber = slotId
          ? next.parkingMap.slots.find((slot) => String(slot.id) === String(slotId))?.slotNumber
          : undefined;
        const payload = (record?.payload ?? null) as RealtimeRecord | null;
        const log: AuditLog = {
          id: readRecordString(record, 'id') ?? crypto.randomUUID(),
          timestamp: readRecordString(record, 'created_at') ?? new Date().toISOString(),
          action: readRecordString(record, 'event_type') ?? 'event',
          operator: readRecordString(payload, 'operator') ?? 'System',
          slotId,
          slotNumber,
          details: payload ? JSON.stringify(payload) : '',
          status: 'success',
        };
        logs.unshift(log);
        next.auditLogs = logs;
      }

      if (table === 'parking_sessions' || table === 'payments' || table === 'parking_lot_layouts') {
        void refreshOperatorData({ silent: true });
      }
    }

    recomputeMetrics(next);
    lastRealtimeEventAt = Date.now();
    cachedData = {
      ...next,
      systemHealth: mergeSystemHealth(next.systemHealth),
    };
    notifyAll();
  }, 200) as unknown as number;
}

export function enqueueOperatorEvent(ev: RealtimePayload) {
  pendingEvents.push(ev);
  scheduleApplyEvents();
}

function ensureRealtimeSubscribed() {
  const realtimeClient = getOperatorRealtimeClient();

  if (!realtimeClient) {
    syncMode = 'polling';
    realtimeStatus = 'degraded';
    if (!fallbackIntervalId) {
      fallbackIntervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          refreshOperatorData();
        }
      }, 8000) as unknown as number;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshOperatorData();
    };
    const handleWindowFocus = () => refreshOperatorData();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    applyHealthToCachedData();
    return;
  }

  if (channel) return;

  syncMode = 'realtime';
  const topic = 'operator-dashboard-live-sync-store';
  channel = realtimeClient
    .channel(topic)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, (payload) => enqueueOperatorEvent(payload as RealtimePayload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => enqueueOperatorEvent(payload as RealtimePayload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_sessions' }, (payload) => enqueueOperatorEvent(payload as RealtimePayload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => enqueueOperatorEvent(payload as RealtimePayload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'operator_events' }, (payload) => enqueueOperatorEvent(payload as RealtimePayload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_lot_layouts' }, (payload) => enqueueOperatorEvent(payload as RealtimePayload))
    .subscribe((status) => {
      realtimeStatus =
        status === 'SUBSCRIBED'
          ? 'healthy'
          : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'
            ? 'offline'
            : 'degraded';
      applyHealthToCachedData();
      notifyAll();
      if (status === 'SUBSCRIBED' && !lastRefreshAt) {
        void refreshOperatorData();
      }
    });
}

export function getCachedOperatorData() {
  return cachedData;
}
