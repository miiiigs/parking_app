import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { assertOperatorLocationRequest } from '@/lib/operatorLocation';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';
import { fetchScopedReservationsWithRelations, fetchScopedSlotRows } from '@/lib/operatorScopedQueries';
import { deriveReservationPaymentStatus, deriveReservationStatus } from '@/lib/operatorReservationStatus';
import { getOperatorSupabaseConfig } from '@/lib/supabase';
import type { Reservation, ReservationListResponse } from '@/lib/types';
import { paginateItems, parsePage, parsePageSize } from '@/lib/operatorPagination';

function toReservationId(value: string) {
  return `RES-${String(value).slice(0, 8).toUpperCase()}`;
}

export async function GET(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/reservations');
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
        statusCounts: { active: 0, completed: 0, 'no-show': 0 },
      } satisfies ReservationListResponse);
    }

    assertOperatorLocationRequest(location.id, locationContext.selectedLocationId);

    const searchParams = new URL(request.url).searchParams;
    const page = parsePage(searchParams.get('page'), 1);
    const pageSize = parsePageSize(searchParams.get('pageSize'), 20, 100);
    const search = searchParams.get('search')?.trim().toLowerCase() ?? '';
    const statusFilter = searchParams.get('status');
    const sourceFilter = searchParams.get('source');

    const slotRows = await fetchScopedSlotRows(config.url, config.serviceRoleKey, location.id);
    const { reservationRows, sessionRows, paymentRows } = await fetchScopedReservationsWithRelations(
      config.url,
      config.serviceRoleKey,
      slotRows,
    );

    const slotLabelMap = new Map(slotRows.map((slot) => [slot.id, slot.slot_label]));
    const latestPaymentByReservationId = new Map<string, (typeof paymentRows)[number]>();
    const latestPaymentBySessionId = new Map<string, (typeof paymentRows)[number]>();

    for (const payment of paymentRows) {
      if (payment.reservation_id && !latestPaymentByReservationId.has(payment.reservation_id)) {
        latestPaymentByReservationId.set(payment.reservation_id, payment);
      }
      if (payment.session_id && !latestPaymentBySessionId.has(payment.session_id)) {
        latestPaymentBySessionId.set(payment.session_id, payment);
      }
    }

    const sessionByReservationId = new Map(
      sessionRows.filter((session) => Boolean(session.reservation_id)).map((session) => [session.reservation_id as string, session]),
    );

    const reservations: Reservation[] = reservationRows.map((reservation) => {
      const linkedSession = sessionByReservationId.get(reservation.id) ?? null;
      const linkedPayment = latestPaymentByReservationId.get(reservation.id) ?? (linkedSession ? latestPaymentBySessionId.get(linkedSession.id) ?? null : null);
      const checkInTime = reservation.reserved_at;
      const checkOutTime = reservation.expires_at;

      return {
        id: reservation.id,
        reservationId: toReservationId(reservation.id),
        source: reservation.source,
        vehicleNumber: reservation.plate_number ?? '',
        driverName: '',
        slotId: reservation.slot_id,
        slotNumber: slotLabelMap.get(reservation.slot_id) ?? 'Unknown',
        checkInTime,
        checkOutTime,
        duration:
          checkInTime && checkOutTime
            ? Math.round((new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) / 60000)
            : 0,
        status: deriveReservationStatus({
          rawStatus: reservation.status,
          linkedSessionStatus: linkedSession?.status ?? null,
          expiresAt: checkOutTime,
        }),
        amount: Number(reservation.reservation_fee ?? 0),
        paymentStatus: deriveReservationPaymentStatus(linkedPayment?.status ?? 'pending'),
        linkedSessionId: linkedSession?.id ?? null,
      };
    });

    const filteredReservations = reservations.filter((reservation) => {
      const matchesStatus = !statusFilter || reservation.status === statusFilter;
      const matchesSource = !sourceFilter || reservation.source === sourceFilter;
      const matchesSearch =
        !search ||
        reservation.reservationId.toLowerCase().includes(search) ||
        reservation.source.toLowerCase().includes(search) ||
        reservation.vehicleNumber.toLowerCase().includes(search) ||
        reservation.slotNumber.toLowerCase().includes(search) ||
        reservation.id.toLowerCase().includes(search);

      return matchesStatus && matchesSource && matchesSearch;
    });

    const sortedReservations = filteredReservations.sort((left, right) => {
      const leftTime = new Date(left.checkInTime ?? 0).getTime();
      const rightTime = new Date(right.checkInTime ?? 0).getTime();
      return rightTime - leftTime;
    });

    const paginated = paginateItems(sortedReservations, page, pageSize);
    const statusCounts = reservations.reduce(
      (counts, reservation) => {
        counts[reservation.status] += 1;
        return counts;
      },
      { active: 0, completed: 0, 'no-show': 0 } satisfies Record<Reservation['status'], number>,
    );

    logOperatorRouteSuccess(routeContext, 'Loaded paginated reservations', {
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
      statusCounts,
    } satisfies ReservationListResponse);
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to load reservations page', error);
    return jsonWithRequestContext(
      routeContext,
      { error: error instanceof Error ? error.message : 'Failed to load reservations.' },
      { status: 500 },
    );
  }
}
