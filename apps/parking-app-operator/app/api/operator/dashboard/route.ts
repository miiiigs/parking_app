import { NextResponse } from 'next/server';

import { buildLocationScopedAdminResetTargets } from '@/lib/operatorAdminScope';
import {
  buildGridSlots,
  buildOperatorDashboardMetrics,
  mapOperatorSlotStatus,
  normalizeSlotStatus,
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
import { getOperatorSupabaseConfig } from '@/lib/supabase';
import type { OperatorDashboardData } from '@/lib/types';

function buildAuditDetails(row: {
  table_name: string;
  action: string;
  record_id: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const source = typeof row.metadata?.source === 'string' ? row.metadata.source : 'database';
  return `${row.table_name} ${row.action} on ${row.record_id ?? 'unknown record'} via ${source}`;
}

export async function GET() {
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getOperatorSupabaseConfig();

  if (!config?.url || !config.serviceRoleKey) {
    return NextResponse.json({ error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  try {
    const headers = getServiceHeaders(config.serviceRoleKey);
    const locationContext = await resolveOperatorLocationContext();
    const location = locationContext.activeLocation;

    if (!location) {
      return NextResponse.json({
        location: null,
        parkingMap: { id: 'map-empty', name: 'Parking Map', totalSlots: 0, slots: [], layout: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        reservations: [],
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
      });
    }

    assertOperatorLocationRequest(location.id, locationContext.selectedLocationId);

    const [slotRows, layoutRows, adminAuditRows] = await Promise.all([
      readRestList<{
        id: string;
        slot_label: string;
        status: SlotSourceStatus;
        display_order: number;
        qr_token: string;
      }>(
        await fetch(
          `${config.url}/rest/v1/parking_slots?select=id,slot_label,status,display_order,qr_token&location_id=eq.${location.id}&order=display_order.asc`,
          { headers, cache: 'no-store' },
        ),
      ),
      readRestList<{ layout: ParkingLotDefinition }>(
        await fetch(
          `${config.url}/rest/v1/parking_lot_layouts?select=layout&location_id=eq.${location.id}&limit=1`,
          { headers, cache: 'no-store' },
        ),
      ),
      readRestList<{
        id: string;
        table_name: string;
        record_id: string | null;
        action: string;
        actor_user_id: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>(
        await fetch(
          `${config.url}/rest/v1/admin_audit_log?select=id,table_name,record_id,action,actor_user_id,metadata,created_at&order=created_at.desc&limit=200`,
          { headers, cache: 'no-store' },
        ),
      ),
    ]);

    const slotIds = slotRows.map((slot) => slot.id);
    const slotIdFilter = slotIds.length > 0 ? buildInFilter(slotIds) : null;

    const [reservationRows, sessionRows] = await Promise.all([
      slotIdFilter
        ? readRestList<{
            id: string;
            slot_id: string;
            plate_number: string;
            status: string;
            reserved_at: string;
            expires_at: string;
            reservation_fee: number;
          }>(
            await fetch(
              `${config.url}/rest/v1/reservations?select=id,slot_id,plate_number,status,reserved_at,expires_at,reservation_fee&slot_id=in.(${slotIdFilter})&order=reserved_at.desc&limit=200`,
              { headers, cache: 'no-store' },
            ),
          )
        : Promise.resolve([]),
      slotIdFilter
        ? readRestList<{
            id: string;
            reservation_id: string;
            slot_id: string;
            started_at: string;
            ended_at: string | null;
            status: string;
            billed_minutes: number | null;
          }>(
            await fetch(
              `${config.url}/rest/v1/parking_sessions?select=id,reservation_id,slot_id,started_at,ended_at,status,billed_minutes&slot_id=in.(${slotIdFilter})&order=started_at.desc&limit=200`,
              { headers, cache: 'no-store' },
            ),
          )
        : Promise.resolve([]),
    ]);

    const reservationIds = reservationRows.map((reservation) => reservation.id);
    const sessionIds = sessionRows.map((session) => session.id);
    const reservationIdFilter = reservationIds.length > 0 ? buildInFilter(reservationIds) : null;
    const sessionIdFilter = sessionIds.length > 0 ? buildInFilter(sessionIds) : null;

    const paymentResultSets = await Promise.all([
      reservationIdFilter
        ? readRestList<{
            id: string;
            reservation_id: string | null;
            session_id: string | null;
            status: string;
            amount: number;
            paid_at: string | null;
            created_at: string;
          }>(
            await fetch(
              `${config.url}/rest/v1/payments?select=id,reservation_id,session_id,status,amount,paid_at,created_at&reservation_id=in.(${reservationIdFilter})&order=created_at.desc&limit=200`,
              { headers, cache: 'no-store' },
            ),
          )
        : Promise.resolve([]),
      sessionIdFilter
        ? readRestList<{
            id: string;
            reservation_id: string | null;
            session_id: string | null;
            status: string;
            amount: number;
            paid_at: string | null;
            created_at: string;
          }>(
            await fetch(
              `${config.url}/rest/v1/payments?select=id,reservation_id,session_id,status,amount,paid_at,created_at&session_id=in.(${sessionIdFilter})&order=created_at.desc&limit=200`,
              { headers, cache: 'no-store' },
            ),
          )
        : Promise.resolve([]),
    ]);
    const paymentRows = Array.from(
      new Map(paymentResultSets.flat().map((payment) => [payment.id, payment])).values(),
    );

    const rawOperatorEventRows = await readRestList<{
      id: string;
      slot_id: string | null;
      reservation_id: string | null;
      session_id: string | null;
      event_type: string;
      payload: Record<string, unknown> | null;
      created_at: string;
    }>(
      await fetch(
        `${config.url}/rest/v1/operator_events?select=id,slot_id,reservation_id,session_id,event_type,payload,created_at&order=created_at.desc&limit=200`,
        { headers, cache: 'no-store' },
      ),
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
        ? await readRestList<{ user_id: string; display_name: string | null; role: string }>(
            await fetch(
              `${config.url}/rest/v1/admin_user_roles?select=user_id,display_name,role&user_id=in.(${actorIds.join(',')})`,
              { headers, cache: 'no-store' },
            ),
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

    const normalizedSlotRows = slotRows.map((slot) => ({
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

    const operatorSlots =
      effectiveLayout?.slots && Array.isArray(effectiveLayout.slots)
        ? effectiveLayout.slots.map((slot) => {
            const live =
              liveSlotLookup.get(slot.id) ??
              normalizedSlotRows.find((entry) => entry.slot_label.toLowerCase() === String(slot.label ?? '').toLowerCase());

            const status = live?.status ?? 'available';
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
    const latestPaymentStatusByReservationId = new Map<string, string>();

    for (const payment of paymentRows) {
      if (payment.reservation_id && !latestPaymentStatusByReservationId.has(payment.reservation_id)) {
        latestPaymentStatusByReservationId.set(payment.reservation_id, payment.status);
      }
    }

    const reservations = reservationRows.map((reservation) => {
      const paymentStatus = latestPaymentStatusByReservationId.get(reservation.id) ?? 'pending';

      return {
        id: reservation.id,
        reservationId: `RES-${String(reservation.id).slice(0, 8).toUpperCase()}`,
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
        status:
          reservation.status === 'confirmed'
            ? 'active'
            : reservation.status === 'completed'
              ? 'completed'
              : reservation.status === 'no_show' || reservation.status === 'expired'
                ? 'no-show'
                : reservation.status,
        amount: Number(reservation.reservation_fee ?? 0),
        paymentStatus:
          paymentStatus === 'paid'
            ? 'completed'
            : paymentStatus === 'failed' || paymentStatus === 'refunded'
              ? 'failed'
              : 'pending',
      };
    });

    const occupiedSlotCount = normalizedSlotRows.filter((slot) => slot.status === 'occupied').length;

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

      return false;
    });

    const auditLogs = [
      ...filteredAdminAuditRows.map((row) => ({
        id: `audit-${row.id}`,
        timestamp: row.created_at,
        action: `${row.table_name}.${row.action}`,
        operator: row.actor_user_id ? actorNameByUserId.get(row.actor_user_id) ?? 'Staff User' : 'System',
        slotId: row.table_name === 'parking_slots' ? row.record_id ?? undefined : undefined,
        slotNumber:
          row.table_name === 'parking_slots' && row.record_id
            ? slotLabelMap.get(row.record_id) ?? undefined
            : undefined,
        details: buildAuditDetails(row),
        status: 'success' as const,
      })),
      ...operatorEventRows.map((row) => ({
        id: `operator-event-${row.id}`,
        timestamp: row.created_at,
        action: row.event_type,
        operator: typeof row.payload?.operator === 'string' ? row.payload.operator : 'System',
        slotId: row.slot_id ?? undefined,
        slotNumber: row.slot_id ? slotLabelMap.get(row.slot_id) ?? undefined : undefined,
        details: typeof row.payload === 'object' ? JSON.stringify(row.payload) : String(row.payload ?? ''),
        status: 'success' as const,
      })),
    ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

    const parkingMap = {
      id: `map-${location.id}`,
      name: effectiveLayout?.name ?? location.name,
      totalSlots: operatorSlots.length,
      slots: operatorSlots,
      layout: effectiveLayout,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const payload: OperatorDashboardData = {
      location,
      parkingMap,
      reservations,
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
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load operator dashboard.' },
      { status: 500 },
    );
  }
}
