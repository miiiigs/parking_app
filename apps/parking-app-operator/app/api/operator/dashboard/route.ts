import { buildLocationScopedAdminResetTargets } from '@/lib/operatorAdminScope';
import {
  buildGridSlots,
  buildOperatorDashboardMetrics,
  mapOperatorSlotStatus,
  normalizeSlotStatus,
  type NormalizedSlotStatus,
  type SlotSourceStatus,
} from '@/lib/operatorDashboardMetrics';
import {
  assertOperatorLocationRequest,
  buildInFilter,
  getServiceHeaders,
  readRestList,
} from '@/lib/operatorLocation';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import {
  applyLiveSlotStatuses,
  buildParkingLotDefinitionFromSlots,
  type ParkingLotDefinition,
} from '@/lib/parkingMap';
import {
  DEFAULT_RESERVATION_PRICING,
  normalizeParkingPricingConfig,
  normalizeReservationPricingConfig,
} from '@/lib/parkingPricing';
import { getOperatorSupabaseConfig } from '@/lib/supabase';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';
import { deriveReservationPaymentStatus, deriveReservationStatus } from '@/lib/operatorReservationStatus';
import type {
  AuditLog,
  OperatorDashboardData,
  OperatorSystemHealth,
  ParkingSessionRecord,
  PaymentRecord,
  Reservation,
} from '@/lib/types';

function buildAuditDetails(row: {
  table_name: string;
  action: string;
  record_id: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const source = typeof row.metadata?.source === 'string' ? row.metadata.source : 'database';
  return `${row.table_name} ${row.action} on ${row.record_id ?? 'unknown record'} via ${source}`;
}

function buildServerSystemHealth(timestamp: string): OperatorSystemHealth {
  return {
    overall: 'healthy',
    database: 'healthy',
    realtime: 'unknown',
    syncMode: 'realtime',
    backendReachable: true,
    lastSuccessfulSyncAt: timestamp,
    lastDashboardRefreshAt: timestamp,
    lastRealtimeEventAt: null,
    failedActionCount: 0,
  };
}

const REST_PAGE_SIZE = 500;
const FILTER_BATCH_SIZE = 150;

function withQueryValue(url: string, key: string, value: string | number) {
  return `${url}${url.includes('?') ? '&' : '?'}${key}=${value}`;
}

function chunkValues(values: string[], size = FILTER_BATCH_SIZE) {
  const chunks: string[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function readPagedRestList<T>(url: string, headers: Record<string, string>, pageSize = REST_PAGE_SIZE): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const page = await readRestList<T>(
      await fetch(withQueryValue(withQueryValue(url, 'limit', pageSize), 'offset', offset), {
        headers,
        cache: 'no-store',
      }),
    );

    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }

    offset += page.length;
  }
}

async function readBatchedInFilterList<T>(
  baseUrl: string,
  filterKey: string,
  ids: string[],
  headers: Record<string, string>,
): Promise<T[]> {
  if (ids.length === 0) {
    return [];
  }

  const resultSets = await Promise.all(
    chunkValues(ids).map((batch) =>
      readPagedRestList<T>(
        `${baseUrl}&${filterKey}=in.(${buildInFilter(batch)})`,
        headers,
      ),
    ),
  );

  return resultSets.flat();
}

export async function GET(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/dashboard');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  const config = getOperatorSupabaseConfig();

  if (!config?.url || !config.serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  try {
    const headers = getServiceHeaders(config.serviceRoleKey);
    const locationContext = await resolveOperatorLocationContext();
    const location = locationContext.activeLocation;

    if (!location) {
      const timestamp = new Date().toISOString();
      const payload = {
        location: null,
        locationPricing: null,
        locationReservationPricing: null,
        parkingMap: { id: 'map-empty', name: 'Parking Map', totalSlots: 0, slots: [], layout: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        reservations: [],
        sessions: [],
        payments: [],
        auditLogs: [],
        metrics: {
          activeReservations: 0,
          occupiedSlots: 0,
          completedSessions: 0,
          noShows: 0,
          dataMismatches: 0,
          totalRevenue: 0,
          occupancyRate: 0,
          averageSessionDuration: 0,
        },
        reconciliationRuns: [],
        systemHealth: buildServerSystemHealth(timestamp),
      };
      logOperatorRouteSuccess(routeContext, 'Loaded empty operator dashboard', {
        locationId: null,
      });
      return jsonWithRequestContext(routeContext, payload);
    }

    assertOperatorLocationRequest(location.id, locationContext.selectedLocationId);

    const [slotRows, layoutRows, adminAuditRows] = await Promise.all([
      readPagedRestList<{
        id: string;
        slot_label: string;
        status: SlotSourceStatus;
        display_order: number;
        qr_token: string;
      }>(
        `${config.url}/rest/v1/parking_slots?select=id,slot_label,status,display_order,qr_token&location_id=eq.${location.id}&order=display_order.asc`,
        headers,
      ),
      readRestList<{ layout: ParkingLotDefinition }>(
        await fetch(
          `${config.url}/rest/v1/parking_lot_layouts?select=layout&location_id=eq.${location.id}&limit=1`,
          { headers, cache: 'no-store' },
        ),
      ),
      readPagedRestList<{
        id: string;
        table_name: string;
        record_id: string | null;
        action: string;
        actor_user_id: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>(
        `${config.url}/rest/v1/admin_audit_log?select=id,table_name,record_id,action,actor_user_id,metadata,created_at&order=created_at.desc`,
        headers,
      ),
    ]);

    const slotIds = slotRows.map((slot) => slot.id);
    const slotIdFilter = slotIds.length > 0 ? buildInFilter(slotIds) : null;

    const [reservationRows, sessionRows] = await Promise.all([
      slotIdFilter
        ? readBatchedInFilterList<{
            id: string;
            slot_id: string;
            source: 'reservation' | 'walk_in';
            plate_number: string;
            status: string;
            reserved_at: string;
            expires_at: string;
            reservation_fee: number;
          }>(
            `${config.url}/rest/v1/reservations?select=id,slot_id,source,plate_number,status,reserved_at,expires_at,reservation_fee&order=reserved_at.desc`,
            'slot_id',
            slotIds,
            headers,
          )
        : Promise.resolve([]),
      slotIdFilter
        ? readBatchedInFilterList<{
            id: string;
            reservation_id: string;
            slot_id: string;
            started_at: string;
            ended_at: string | null;
            status: string;
            billed_minutes: number | null;
          }>(
            `${config.url}/rest/v1/parking_sessions?select=id,reservation_id,slot_id,started_at,ended_at,status,billed_minutes&order=started_at.desc`,
            'slot_id',
            slotIds,
            headers,
          )
        : Promise.resolve([]),
    ]);

    const reservationIds = reservationRows.map((reservation) => reservation.id);
    const sessionIds = sessionRows.map((session) => session.id);
    const reservationIdFilter = reservationIds.length > 0 ? buildInFilter(reservationIds) : null;
    const sessionIdFilter = sessionIds.length > 0 ? buildInFilter(sessionIds) : null;

    const paymentResultSets = await Promise.all([
      reservationIdFilter
        ? readBatchedInFilterList<{
            id: string;
            reservation_id: string | null;
            session_id: string | null;
            status: string;
            amount: number;
            paid_at: string | null;
            created_at: string;
          }>(
            `${config.url}/rest/v1/payments?select=id,reservation_id,session_id,status,amount,paid_at,created_at&order=created_at.desc`,
            'reservation_id',
            reservationIds,
            headers,
          )
        : Promise.resolve([]),
      sessionIdFilter
        ? readBatchedInFilterList<{
            id: string;
            reservation_id: string | null;
            session_id: string | null;
            status: string;
            amount: number;
            paid_at: string | null;
            created_at: string;
          }>(
            `${config.url}/rest/v1/payments?select=id,reservation_id,session_id,status,amount,paid_at,created_at&order=created_at.desc`,
            'session_id',
            sessionIds,
            headers,
          )
        : Promise.resolve([]),
    ]);
    const paymentRows = Array.from(
      new Map(paymentResultSets.flat().map((payment) => [payment.id, payment])).values(),
    );

    const rawOperatorEventRows = await readPagedRestList<{
      id: string;
      slot_id: string | null;
      reservation_id: string | null;
      session_id: string | null;
      event_type: string;
      payload: Record<string, unknown> | null;
      created_at: string;
    }>(
      `${config.url}/rest/v1/operator_events?select=id,slot_id,reservation_id,session_id,event_type,payload,created_at&order=created_at.desc`,
      headers,
    );
    const scopedTargets = buildLocationScopedAdminResetTargets({
      locationId: location.id,
      locationSlotIds: slotIds,
      reservations: reservationRows.map((row) => ({
        id: row.id,
        slotId: row.slot_id,
      })),
      sessions: sessionRows.map((row) => ({
        id: row.id,
        reservationId: row.reservation_id,
        slotId: row.slot_id,
      })),
      payments: paymentRows.map((row) => ({
        id: row.id,
        reservationId: row.reservation_id,
        sessionId: row.session_id,
      })),
      operatorEvents: rawOperatorEventRows.map((row) => ({
        id: row.id,
        slotId: row.slot_id,
        reservationId: row.reservation_id,
        sessionId: row.session_id,
        payload: row.payload,
      })),
    });
    const scopedOperatorEventIds = new Set(scopedTargets.operatorEventIds);
    const operatorEventRows = rawOperatorEventRows.filter((row) => scopedOperatorEventIds.has(row.id));

    const actorIds = Array.from(
      new Set(
        [...adminAuditRows.map((row) => row.actor_user_id)].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    );

    const roleRows =
      actorIds.length > 0
        ? await readBatchedInFilterList<{ user_id: string; display_name: string | null; role: string }>(
            `${config.url}/rest/v1/admin_user_roles?select=user_id,display_name,role`,
            'user_id',
            actorIds,
            headers,
          )
        : [];

    const actorNameByUserId = new Map(
      roleRows.map((row) => [row.user_id, row.display_name ?? row.role.toUpperCase()]),
    );
    const reservationIdSet = new Set(reservationIds);
    const sessionIdSet = new Set(sessionIds);
    const slotIdSet = new Set(slotIds);

    const activeSessionRows = sessionRows.filter((session) => session.status === 'active');
    const completedSessionRows = sessionRows.filter((session) => session.status === 'completed');
    const activeSessionSlotIds = new Set(activeSessionRows.map((session) => session.slot_id));
    const confirmedReservationSlotIds = new Set(
      reservationRows.filter((reservation) => reservation.status === 'confirmed').map((reservation) => reservation.slot_id),
    );

    const normalizedSlotRows: Array<{
      id: string;
      slot_label: string;
      status: NormalizedSlotStatus;
      display_order: number;
      qr_token: string;
    }> = slotRows.map((slot) => ({
      ...slot,
      status: normalizeSlotStatus({
        rawStatus: slot.status,
        hasActiveSession: activeSessionSlotIds.has(slot.id),
        hasConfirmedReservation: confirmedReservationSlotIds.has(slot.id),
      }),
    }));

    const layout = layoutRows[0]?.layout ?? null;
    const effectiveLayout: ParkingLotDefinition = layout
      ? applyLiveSlotStatuses(layout, normalizedSlotRows.map((slot) => ({
          id: slot.id,
          label: slot.slot_label,
          status: slot.status,
          displayOrder: slot.display_order,
        })))
      : buildParkingLotDefinitionFromSlots(
          normalizedSlotRows.map((slot) => ({
            id: slot.id,
            slotLabel: slot.slot_label,
            status: slot.status,
            displayOrder: slot.display_order,
          })),
          location.name,
        );
    const liveSlotLookup = new Map(
      normalizedSlotRows.map((slot) => [
        slot.id,
        {
          id: slot.id,
          label: slot.slot_label,
          status: slot.status,
          displayOrder: slot.display_order,
        },
      ]),
    );

    const operatorSlots: OperatorDashboardData['parkingMap']['slots'] =
      effectiveLayout?.slots && Array.isArray(effectiveLayout.slots)
        ? effectiveLayout.slots.map((slot) => {
            const live =
              liveSlotLookup.get(slot.id) ??
              normalizedSlotRows.find((entry) => entry.slot_label.toLowerCase() === String(slot.label ?? '').toLowerCase());

            const status: NormalizedSlotStatus =
              live?.status === 'occupied' || live?.status === 'reserved' || live?.status === 'blocked'
                ? live.status
                : 'available';
            const liveId = live && 'id' in live ? live.id : slot.id;
            const liveLabel =
              live && 'label' in live
                ? live.label
                : live && 'slot_label' in live
                  ? live.slot_label
                  : slot.label ?? 'Unknown';

            return {
              id: liveId,
              slotNumber: liveLabel,
              status: mapOperatorSlotStatus(status),
              x: Math.round(slot.x ?? 0),
              y: Math.round(slot.y ?? 0),
              width: Math.round(slot.width ?? 92),
              height: Math.round(slot.height ?? 76),
              rotation: slot.rotation ?? 0,
              vehicleType: 'standard',
            };
          })
        : buildGridSlots(normalizedSlotRows);

    const slotLabelMap = new Map(operatorSlots.map((slot) => [slot.id, slot.slotNumber]));
    const normalizePaymentStatus = (status: string): PaymentRecord['status'] =>
      status === 'paid'
        ? 'completed'
        : status === 'failed'
          ? 'failed'
          : status === 'refunded'
            ? 'refunded'
            : 'pending';

    const payments: PaymentRecord[] = paymentRows.map((payment) => ({
      id: payment.id,
      paymentId: `PAY-${String(payment.id).slice(0, 8).toUpperCase()}`,
      reservationId: payment.reservation_id ?? null,
      sessionId: payment.session_id ?? null,
      status: normalizePaymentStatus(payment.status),
      amount: Number(payment.amount ?? 0),
      createdAt: payment.created_at,
      paidAt: payment.paid_at,
    }));

    const latestPaymentByReservationId = new Map<string, PaymentRecord>();
    const latestPaymentBySessionId = new Map<string, PaymentRecord>();
    for (const payment of payments) {
      if (payment.reservationId && !latestPaymentByReservationId.has(payment.reservationId)) {
        latestPaymentByReservationId.set(payment.reservationId, payment);
      }

      if (payment.sessionId && !latestPaymentBySessionId.has(payment.sessionId)) {
        latestPaymentBySessionId.set(payment.sessionId, payment);
      }
    }

    const sessionByReservationId = new Map(sessionRows.map((session) => [session.reservation_id, session]).filter((entry): entry is [string, (typeof sessionRows)[number]] => Boolean(entry[0])));
    const sessions: ParkingSessionRecord[] = sessionRows.map((session) => {
      const linkedPayment = latestPaymentBySessionId.get(session.id);

      return {
        id: session.id,
        sessionId: `SES-${String(session.id).slice(0, 8).toUpperCase()}`,
        reservationId: session.reservation_id ?? null,
        slotId: session.slot_id,
        slotNumber: slotLabelMap.get(session.slot_id) ?? 'Unknown',
        startedAt: session.started_at,
        endedAt: session.ended_at,
        billedMinutes: Number(session.billed_minutes ?? 0),
        status:
          session.status === 'completed'
            ? 'completed'
            : session.status === 'cancelled'
              ? 'cancelled'
              : session.status === 'expired'
                ? 'expired'
                : session.status === 'active'
                  ? 'active'
                  : 'pending',
        amount: Number(linkedPayment?.amount ?? 0),
        paymentStatus: linkedPayment?.status ?? 'pending',
      };
    });

    const reservations: Reservation[] = reservationRows.map((reservation) => {
      const linkedPayment = latestPaymentByReservationId.get(reservation.id);
      const linkedSession = sessionByReservationId.get(reservation.id) ?? null;
      const status = deriveReservationStatus({
        rawStatus: reservation.status,
        linkedSessionStatus: linkedSession?.status ?? null,
        expiresAt: reservation.expires_at,
      });

      return {
        id: reservation.id,
        reservationId: `RES-${String(reservation.id).slice(0, 8).toUpperCase()}`,
        source: reservation.source,
        vehicleNumber: reservation.plate_number ?? '',
        driverName: '',
        slotId: reservation.slot_id,
        slotNumber: slotLabelMap.get(reservation.slot_id) ?? 'Unknown',
        checkInTime: reservation.reserved_at,
        checkOutTime: reservation.expires_at,
        duration:
          reservation.reserved_at && reservation.expires_at
            ? Math.round(
                (new Date(reservation.expires_at).getTime() - new Date(reservation.reserved_at).getTime()) / 60000,
              )
            : 0,
        status,
        amount: Number(reservation.reservation_fee ?? 0),
        paymentStatus:
          linkedPayment?.status === 'refunded'
            ? 'failed'
            : deriveReservationPaymentStatus(linkedPayment?.status ?? 'pending'),
        linkedSessionId: linkedSession?.id ?? null,
      };
    });

    const occupiedSlotCount = normalizedSlotRows.filter((slot) => slot.status === 'occupied').length;

    const paymentIdSet = new Set(paymentRows.map((payment) => payment.id));

    const filteredAdminAuditRows = adminAuditRows.filter((row) => {
      const metadataLocationId =
        typeof row.metadata?.location_id === 'string'
          ? row.metadata.location_id
          : typeof row.metadata?.locationId === 'string'
            ? row.metadata.locationId
            : null;

      if (metadataLocationId === location.id) {
        return true;
      }

      if (row.table_name === 'parking_slots' && row.record_id) {
        return slotIdSet.has(row.record_id);
      }

      if (row.table_name === 'reservations' && row.record_id) {
        return reservationIdSet.has(row.record_id);
      }

      if (row.table_name === 'parking_sessions' && row.record_id) {
        return sessionIdSet.has(row.record_id);
      }

      if (row.table_name === 'payments' && row.record_id) {
        return paymentIdSet.has(row.record_id);
      }

      return false;
    });

    const auditLogs: AuditLog[] = [
      ...filteredAdminAuditRows.map((row) => ({
        id: `audit-${row.id}`,
        timestamp: row.created_at,
        action: `${row.table_name}.${row.action}`,
        operator: row.actor_user_id ? actorNameByUserId.get(row.actor_user_id) ?? 'Staff User' : 'System',
        tableName: row.table_name,
        slotId: row.table_name === 'parking_slots' ? row.record_id ?? undefined : undefined,
        slotNumber:
          row.table_name === 'parking_slots' && row.record_id
            ? slotLabelMap.get(row.record_id) ?? undefined
            : undefined,
        reservationId:
          row.table_name === 'reservations'
            ? row.record_id ?? undefined
            : typeof row.metadata?.reservation_id === 'string'
              ? row.metadata.reservation_id
              : undefined,
        sessionId:
          row.table_name === 'parking_sessions'
            ? row.record_id ?? undefined
            : typeof row.metadata?.session_id === 'string'
              ? row.metadata.session_id
              : undefined,
        paymentId:
          row.table_name === 'payments'
            ? row.record_id ?? undefined
            : typeof row.metadata?.payment_id === 'string'
              ? row.metadata.payment_id
              : undefined,
        details: buildAuditDetails(row),
        status: 'success' as const,
      })),
      ...operatorEventRows.map((row) => ({
        id: `operator-event-${row.id}`,
        timestamp: row.created_at,
        action: row.event_type,
        operator: typeof row.payload?.operator === 'string' ? row.payload.operator : 'System',
        tableName: 'operator_events',
        slotId: row.slot_id ?? undefined,
        slotNumber: row.slot_id ? slotLabelMap.get(row.slot_id) ?? undefined : undefined,
        reservationId: row.reservation_id ?? undefined,
        sessionId: row.session_id ?? undefined,
        paymentId:
          typeof row.payload?.payment_id === 'string'
            ? row.payload.payment_id
            : undefined,
        details: typeof row.payload === 'object' ? JSON.stringify(row.payload) : String(row.payload ?? ''),
        status: 'success' as const,
      })),
    ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

    const parkingMap: OperatorDashboardData['parkingMap'] = {
      id: `map-${location.id}`,
      name: effectiveLayout?.name ?? location.name,
      totalSlots: operatorSlots.length,
      slots: operatorSlots,
      layout: effectiveLayout,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const generatedAt = new Date().toISOString();
    const locationPricing = normalizeParkingPricingConfig({
      mode: location.pricing_mode,
      flatRateAmount: location.flat_rate_amount,
      fixedRateAmount: location.fixed_rate_amount ?? location.fixed_hourly_rate,
      fixedRateIntervalMinutes: location.fixed_rate_interval_minutes,
      firstPeriodMinutes:
        location.first_period_minutes
        ?? (location.first_period_hours ? location.first_period_hours * 60 : undefined),
      firstPeriodRate: location.first_period_rate,
      succeedingRateAmount: location.succeeding_rate_amount ?? location.succeeding_hourly_rate,
      succeedingRateIntervalMinutes: location.succeeding_rate_interval_minutes,
      entryGraceMinutes: location.entry_grace_minutes,
      exitGraceMinutes: location.exit_grace_minutes,
    });
    const locationReservationPricing = normalizeReservationPricingConfig({
      fee30Minutes: location.reservation_fee_30_minutes ?? DEFAULT_RESERVATION_PRICING.fee30Minutes,
      fee60Minutes: location.reservation_fee_60_minutes ?? DEFAULT_RESERVATION_PRICING.fee60Minutes,
      fee120Minutes: location.reservation_fee_120_minutes ?? DEFAULT_RESERVATION_PRICING.fee120Minutes,
    });

    const payload: OperatorDashboardData = {
      location,
      locationPricing,
      locationReservationPricing,
      parkingMap,
      reservations,
      sessions,
      payments,
      auditLogs,
      metrics: buildOperatorDashboardMetrics({
        reservations,
        operatorSlotCount: operatorSlots.length,
        occupiedSlotCount,
        slotRows: slotRows.map((slot) => ({
          id: slot.id,
          status: slot.status,
        })),
        normalizedSlotRows: normalizedSlotRows.map((slot) => ({
          id: slot.id,
          status: slot.status,
        })),
        completedSessionRows,
        paymentRows,
      }),
      reconciliationRuns: operatorEventRows
        .filter((row) => row.event_type === 'reconciliation_completed')
        .map((row) => ({
          id: row.id,
          runStatus:
            typeof row.payload?.run_status === 'string' && ['running', 'completed', 'failed'].includes(row.payload.run_status)
              ? (row.payload.run_status as 'running' | 'completed' | 'failed')
              : 'completed',
          mismatchCount: Number(row.payload?.mismatch_count ?? 0),
          fixedCount: Number(row.payload?.fixed_count ?? 0),
          message: typeof row.payload?.message === 'string' ? row.payload.message : null,
          startedAt:
            typeof row.payload?.started_at === 'string'
              ? row.payload.started_at
              : row.created_at,
          completedAt:
            typeof row.payload?.completed_at === 'string'
              ? row.payload.completed_at
              : row.created_at,
        }))
        .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()),
      systemHealth: buildServerSystemHealth(generatedAt),
    };

    logOperatorRouteSuccess(routeContext, 'Loaded operator dashboard', {
      locationId: location.id,
      slotCount: operatorSlots.length,
      reservationCount: reservations.length,
      sessionCount: sessions.length,
    });
    return jsonWithRequestContext(routeContext, payload);
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to load operator dashboard', error);
    return jsonWithRequestContext(
      routeContext,
      { error: error instanceof Error ? error.message : 'Failed to load operator dashboard.' },
      { status: 500 },
    );
  }
}
