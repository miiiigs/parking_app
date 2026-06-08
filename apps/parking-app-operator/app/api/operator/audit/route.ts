import { NextResponse } from 'next/server';

import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { assertOperatorLocationRequest } from '@/lib/operatorLocation';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';
import {
  fetchScopedAuditSourceRows,
  fetchScopedReservationsWithRelations,
  fetchScopedSlotRows,
} from '@/lib/operatorScopedQueries';
import { buildCsv } from '@/lib/csv';
import { getOperatorSupabaseConfig } from '@/lib/supabase';
import type { AuditListResponse, AuditLog } from '@/lib/types';
import { paginateItems, parsePage, parsePageSize } from '@/lib/operatorPagination';

function buildAuditDetails(row: {
  table_name: string;
  action: string;
  record_id: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const source = typeof row.metadata?.source === 'string' ? row.metadata.source : 'database';
  return `${row.table_name} ${row.action} on ${row.record_id ?? 'unknown record'} via ${source}`;
}

export async function GET(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/audit');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  try {
    const locationContext = await resolveOperatorLocationContext();
    const location = locationContext.activeLocation;

    if (!location) {
      return jsonWithRequestContext(routeContext, {
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
        uniqueActions: [],
        stats: { success: 0, failure: 0 },
      } satisfies AuditListResponse);
    }

    assertOperatorLocationRequest(location.id, locationContext.selectedLocationId);

    const searchParams = new URL(request.url).searchParams;
    const page = parsePage(searchParams.get('page'), 1);
    const pageSize = parsePageSize(searchParams.get('pageSize'), 20, 100);
    const search = searchParams.get('search')?.trim().toLowerCase() ?? '';
    const statusFilter = searchParams.get('status');
    const actionFilter = searchParams.get('action');
    const exportFormat = searchParams.get('export');

    const slotRows = await fetchScopedSlotRows(config.url, config.serviceRoleKey, location.id);
    const { reservationRows, sessionRows, paymentRows } = await fetchScopedReservationsWithRelations(
      config.url,
      config.serviceRoleKey,
      slotRows,
    );
    const { adminAuditRows, operatorEventRows, actorNameByUserId } = await fetchScopedAuditSourceRows(
      config.url,
      config.serviceRoleKey,
      location.id,
      slotRows,
      reservationRows,
      sessionRows,
      paymentRows,
    );

    const slotLabelMap = new Map(slotRows.map((slot) => [slot.id, slot.slot_label]));

    const logs: AuditLog[] = [
      ...adminAuditRows.map((row) => ({
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
        paymentId: typeof row.payload?.payment_id === 'string' ? row.payload.payment_id : undefined,
        details: typeof row.payload === 'object' ? JSON.stringify(row.payload) : String(row.payload ?? ''),
        status: 'success' as const,
      })),
    ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

    const filteredLogs = logs.filter((log) => {
      const matchesSearch =
        !search ||
        log.action.toLowerCase().includes(search) ||
        log.operator.toLowerCase().includes(search) ||
        log.details.toLowerCase().includes(search) ||
        log.slotNumber?.toLowerCase().includes(search) ||
        log.reservationId?.toLowerCase().includes(search) ||
        log.sessionId?.toLowerCase().includes(search) ||
        log.paymentId?.toLowerCase().includes(search);

      const matchesStatus = !statusFilter || log.status === statusFilter;
      const matchesAction = !actionFilter || log.action === actionFilter;
      return matchesSearch && matchesStatus && matchesAction;
    });

    const stats = {
      success: filteredLogs.filter((log) => log.status === 'success').length,
      failure: filteredLogs.filter((log) => log.status === 'failure').length,
    };

    const uniqueActions = Array.from(new Set(filteredLogs.map((log) => log.action))).sort();
    const paginated = paginateItems(filteredLogs, page, pageSize);

    if (exportFormat === 'csv') {
      const csv = buildCsv(filteredLogs, [
        'timestamp',
        'action',
        'operator',
        'slotNumber',
        'reservationId',
        'sessionId',
        'paymentId',
        'details',
        'status',
      ]);

      const response = new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="operator-audit-${location.id}.csv"`,
        },
      });
      response.headers.set('x-correlation-id', routeContext.requestId);
      logOperatorRouteSuccess(routeContext, 'Exported audit logs', {
        locationId: location.id,
        exportFormat: 'csv',
        totalItems: filteredLogs.length,
      });
      return response;
    }

    logOperatorRouteSuccess(routeContext, 'Loaded paginated audit logs', {
      locationId: location.id,
      totalItems: paginated.totalItems,
      page: paginated.page,
      pageSize: paginated.pageSize,
    });

    return jsonWithRequestContext(routeContext, {
      items: paginated.items,
      pagination: {
        page: paginated.page,
        pageSize: paginated.pageSize,
        totalItems: paginated.totalItems,
        totalPages: paginated.totalPages,
      },
      uniqueActions,
      stats,
    } satisfies AuditListResponse);
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to load audit logs', error);
    return jsonWithRequestContext(
      routeContext,
      { error: error instanceof Error ? error.message : 'Failed to load audit logs.' },
      { status: 500 },
    );
  }
}
