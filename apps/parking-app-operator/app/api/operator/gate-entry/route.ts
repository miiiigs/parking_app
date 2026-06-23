import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { getServiceHeaders } from '@/lib/operatorLocation';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { hasOperatorLocationAssignment } from '@/lib/operatorLocationAccess';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';
import { formatRouteValidationIssues, operatorGateEntryRouteRequestSchema } from '@/lib/operatorRouteSchemas';
import { getOperatorSupabaseConfig } from '@/lib/supabase';

const ENTRY_PASS_PREFIXES = ['reservation-entry|', 'walkin-entry-pass|'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveReservationId(entryPass: string) {
  const prefix = ENTRY_PASS_PREFIXES.find((candidate) => entryPass.startsWith(candidate));
  const value = prefix ? entryPass.slice(prefix.length).trim() : entryPass.trim();

  return UUID_PATTERN.test(value) ? value : null;
}

export async function POST(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/gate-entry');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasOperatorCapability(operatorUser.role, 'edit-slot-status')) {
    return jsonWithRequestContext(routeContext, { error: 'Insufficient permissions to confirm parking entry.' }, { status: 403 });
  }

  const parsedBody = operatorGateEntryRouteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return jsonWithRequestContext(routeContext, {
      error: 'Invalid gate entry request.',
      details: formatRouteValidationIssues(parsedBody.error.issues),
    }, { status: 400 });
  }

  const reservationId = resolveReservationId(parsedBody.data.entryPass);
  if (!reservationId) {
    return jsonWithRequestContext(routeContext, { error: 'Malformed reservation entry pass.' }, { status: 400 });
  }

  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  try {
    const locationContext = await resolveOperatorLocationContext();
    const activeLocation = locationContext.activeLocation;
    if (!activeLocation) {
      return jsonWithRequestContext(routeContext, { error: 'No active parking location found.' }, { status: 404 });
    }

    const isAssignedToLocation = await hasOperatorLocationAssignment({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      userId: operatorUser.id,
      locationId: activeLocation.id,
    });
    if (!isAssignedToLocation) {
      return jsonWithRequestContext(routeContext, {
        error: 'Operator is not assigned to the active parking location.',
      }, { status: 403 });
    }

    const rpcResponse = await fetch(`${config.url}/rest/v1/rpc/confirm_parking_entry`, {
      method: 'POST',
      headers: {
        ...getServiceHeaders(config.serviceRoleKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_reservation_id: reservationId,
        p_location_id: activeLocation.id,
      }),
      cache: 'no-store',
    });

    const payload = await rpcResponse.json().catch(() => null);
    if (!rpcResponse.ok) {
      const message = payload?.message ?? payload?.error ?? 'Unable to confirm parking entry.';
      const status = message.includes('active operator location') ? 409 : message.includes('not found') ? 404 : 422;
      return jsonWithRequestContext(routeContext, { error: message }, { status });
    }

    const confirmation = Array.isArray(payload) ? payload[0] ?? null : payload;
    logOperatorRouteSuccess(routeContext, 'Confirmed parking entry', {
      reservationId,
      locationId: activeLocation.id,
      idempotentReplay: Boolean(confirmation?.idempotent_replay),
    });

    return jsonWithRequestContext(routeContext, { ok: true, confirmation });
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to confirm parking entry', error, { reservationId });
    return jsonWithRequestContext(routeContext, { error: 'Unable to confirm parking entry.' }, { status: 500 });
  }
}
