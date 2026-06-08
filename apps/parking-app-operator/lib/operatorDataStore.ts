import type { RealtimeChannel } from '@supabase/supabase-js';

import { getOperatorRealtimeClient } from './realtimeClient';
import type { ParkingSlotStatus } from './parkingMap';
import type { AuditLog, OperatorDashboardData, ParkingSlot, Reservation } from './types';

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

function notifyAll() {
  for (const cb of subscribers) cb({ data: cachedData, loading });
}

function normalizeOperatorSlotStatus(status: string): ParkingSlot['status'] {
  return status === 'blocked' || status === 'disputed' ? 'maintenance' : status;
}

function normalizeLayoutSlotStatus(status: string): ParkingSlotStatus {
  return status === 'maintenance' ? 'blocked' : status;
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
      return cachedData;
    }

    const payload = (await res.json().catch(() => null)) as OperatorDashboardData | null;
    if (payload) {
      cachedData = payload;
      lastRefreshAt = Date.now();
    }

    return cachedData;
  } catch {
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
  cachedData = next;
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
    cachedData = next;
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
    return;
  }

  if (channel) return;

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
      if (status === 'SUBSCRIBED' && !lastRefreshAt) {
        void refreshOperatorData();
      }
    });
}

export function getCachedOperatorData() {
  return cachedData;
}
