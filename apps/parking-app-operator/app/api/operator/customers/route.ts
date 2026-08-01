import { buildCustomerOversightItems } from '@/lib/customerOversight';
import { listAuthUsersByIds } from '@/lib/operatorAdminAccess';
import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { getServiceHeaders } from '@/lib/operatorLocation';
import { paginateItems, parsePage, parsePageSize } from '@/lib/operatorPagination';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';
import { readPagedRestList } from '@/lib/operatorScopedQueries';
import { getOperatorSupabaseConfig } from '@/lib/supabase';
import type { CustomerOversightResponse } from '@/lib/types';

function ensureAdmin(operatorUser: Awaited<ReturnType<typeof getCurrentOperatorUser>>) {
  return operatorUser?.role === 'admin';
}

export async function GET(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/customers');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!ensureAdmin(operatorUser)) {
    return jsonWithRequestContext(routeContext, { error: 'Only admin users can view customer oversight.' }, { status: 403 });
  }

  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  try {
    const headers = getServiceHeaders(config.serviceRoleKey);
    const searchParams = new URL(request.url).searchParams;
    const page = parsePage(searchParams.get('page'), 1);
    const pageSize = parsePageSize(searchParams.get('pageSize'), 20, 100);
    const search = searchParams.get('search')?.trim().toLowerCase() ?? '';
    const overlapFilter = searchParams.get('overlap') ?? 'all';

    const [reservations, sessions, payments, slots, locations, dashboardAccounts] = await Promise.all([
      readPagedRestList<{
        id: string;
        user_id: string;
        slot_id: string;
        plate_number: string | null;
        status: string;
        reserved_at: string;
        expires_at: string | null;
      }>(
        `${config.url}/rest/v1/reservations?select=id,user_id,slot_id,plate_number,status,reserved_at,expires_at&order=reserved_at.desc`,
        headers,
      ),
      readPagedRestList<{
        id: string;
        reservation_id: string | null;
        slot_id: string;
        started_at: string;
        ended_at: string | null;
        status: string;
      }>(
        `${config.url}/rest/v1/parking_sessions?select=id,reservation_id,slot_id,started_at,ended_at,status&order=started_at.desc`,
        headers,
      ),
      readPagedRestList<{
        id: string;
        reservation_id: string | null;
        session_id: string | null;
        status: string;
        amount: number | null;
        created_at: string;
        paid_at: string | null;
      }>(
        `${config.url}/rest/v1/payments?select=id,reservation_id,session_id,status,amount,created_at,paid_at&order=created_at.desc`,
        headers,
      ),
      readPagedRestList<{
        id: string;
        location_id: string;
      }>(
        `${config.url}/rest/v1/parking_slots?select=id,location_id`,
        headers,
      ),
      readPagedRestList<{
        id: string;
        name: string;
        city: string | null;
      }>(
        `${config.url}/rest/v1/locations?select=id,name,city&order=created_at.asc`,
        headers,
      ),
      readPagedRestList<{
        user_id: string;
        display_name: string | null;
        role: 'admin' | 'operator' | 'support' | 'finance';
      }>(
        `${config.url}/rest/v1/admin_user_roles?select=user_id,display_name,role&order=display_name.asc`,
        headers,
      ),
    ]);

    const userIds = Array.from(new Set(reservations.map((reservation) => reservation.user_id)));
    const authUsers = await listAuthUsersByIds({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      userIds,
    });

    const locationById = new Map(
      locations.map((location) => [
        location.id,
        {
          id: location.id,
          name: location.city ? `${location.name} (${location.city})` : location.name,
        },
      ]),
    );
    const slotLocationBySlotId = new Map(
      slots.map((slot) => [slot.id, locationById.get(slot.location_id) ?? { id: slot.location_id, name: 'Unknown location' }]),
    );

    const items = buildCustomerOversightItems({
      reservations,
      sessions,
      payments,
      slotLocationBySlotId,
      authUsersById: new Map(authUsers.map((user) => [user.id, user])),
      dashboardAccountsByUserId: new Map(dashboardAccounts.map((account) => [account.user_id, account])),
    });

    const filteredItems = items.filter((item) => {
      const matchesOverlap =
        overlapFilter === 'dashboard'
          ? item.hasDashboardAccess
          : overlapFilter === 'customer-only'
            ? !item.hasDashboardAccess
            : true;

      const matchesSearch =
        !search
        || item.userId.toLowerCase().includes(search)
        || (item.displayName ?? '').toLowerCase().includes(search)
        || (item.email ?? '').toLowerCase().includes(search)
        || (item.phone ?? '').toLowerCase().includes(search)
        || (item.dashboardRole ?? '').toLowerCase().includes(search)
        || (item.latestLocationName ?? '').toLowerCase().includes(search)
        || item.visitedLocationNames.some((locationName) => locationName.toLowerCase().includes(search))
        || item.recentVehiclePlates.some((plate) => plate.toLowerCase().includes(search));

      return matchesOverlap && matchesSearch;
    });

    const paginated = paginateItems(filteredItems, page, pageSize);
    const response: CustomerOversightResponse = {
      items: paginated.items,
      pagination: {
        page: paginated.page,
        pageSize: paginated.pageSize,
        totalItems: paginated.totalItems,
        totalPages: paginated.totalPages,
      },
      summary: {
        totalCustomers: items.length,
        activeCustomers: items.filter((item) => item.activeReservations > 0 || item.activeSessions > 0).length,
        dashboardOverlapCount: items.filter((item) => item.hasDashboardAccess).length,
        missingContactCount: items.filter((item) => !item.email && !item.phone).length,
      },
      limitations: [
        'Customer display names only appear when Supabase Auth metadata or dashboard-role records already provide them.',
        'Vehicle history is derived from reservation plate numbers and will not include vehicles that never created a reservation.',
        'This surface is read-only and does not yet include refunds, customer edits, or support-ticket workflows.',
      ],
    };

    logOperatorRouteSuccess(routeContext, 'Loaded admin customer oversight', {
      totalCustomers: items.length,
      filteredCustomers: filteredItems.length,
      page: paginated.page,
      pageSize: paginated.pageSize,
    });

    return jsonWithRequestContext(routeContext, response);
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to load admin customer oversight', error);
    return jsonWithRequestContext(
      routeContext,
      { error: error instanceof Error ? error.message : 'Failed to load customer oversight.' },
      { status: 500 },
    );
  }
}
