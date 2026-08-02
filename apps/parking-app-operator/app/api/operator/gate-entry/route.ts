import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { getServiceHeaders } from '@/lib/operatorLocation';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { hasOperatorLocationAssignment } from '@/lib/operatorLocationAccess';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';
import { formatRouteValidationIssues, operatorGateEntryRouteRequestSchema } from '@/lib/operatorRouteSchemas';
import { getOperatorSupabaseConfig } from '@/lib/supabase';
import { parseEntryPass } from '@parking/shared';

function getConfirmationErrorStatus(message: string) {
  if (message.includes('Legacy walk-in entry pass')) {
    return 400;
  }

  if (message.includes('expired')) {
    return 410;
  }

  if (message.includes('already used')) {
    return 409;
  }

  if (message.includes('invalid') || message.includes('does not match') || message.includes('no longer accepted')) {
    return 403;
  }

  if (message.includes('not found')) {
    return 404;
  }

  if (message.includes('Could not find the function public.confirm_parking_entry')) {
    return 503;
  }

  if (message.includes('active operator location')) {
    return 409;
  }

  return 422;
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

  const parsedEntryPass = parseEntryPass(parsedBody.data.entryPass);
  if (!parsedEntryPass) {
    return jsonWithRequestContext(routeContext, { error: 'Malformed reservation entry pass.' }, { status: 400 });
  }
  const reservationId = parsedEntryPass.reservationId;

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

    const reservationLookupResponse = await fetch(
      `${config.url}/rest/v1/reservations?select=id,source,slot_id,parking_slots(qr_token)&id=eq.${encodeURIComponent(reservationId)}&limit=1`,
      {
        headers: getServiceHeaders(config.serviceRoleKey),
        cache: 'no-store',
      },
    );
    const reservationLookupPayload = await reservationLookupResponse.json().catch(() => []);
    if (!reservationLookupResponse.ok) {
      return jsonWithRequestContext(routeContext, { error: 'Unable to validate the entry pass right now.' }, { status: 503 });
    }

    const reservationRecord = Array.isArray(reservationLookupPayload) ? reservationLookupPayload[0] ?? null : null;
    if (!reservationRecord) {
      return jsonWithRequestContext(routeContext, { error: 'Entry pass not found.' }, { status: 404 });
    }

    const reservationSource = reservationRecord.source === 'walk_in' ? 'walk_in' : 'reservation';
    if (reservationSource !== parsedEntryPass.kind) {
      return jsonWithRequestContext(routeContext, { error: 'Entry pass type does not match the reservation source.' }, { status: 403 });
    }

    const reservationSlot = Array.isArray(reservationRecord.parking_slots)
      ? reservationRecord.parking_slots[0] ?? null
      : reservationRecord.parking_slots ?? null;
    const expectedSlotQrToken = typeof reservationSlot?.qr_token === 'string' ? reservationSlot.qr_token : null;
    if (parsedEntryPass.kind === 'reservation' && parsedEntryPass.slotQrToken && expectedSlotQrToken !== parsedEntryPass.slotQrToken) {
      return jsonWithRequestContext(routeContext, { error: 'Entry pass validation failed for this reserved slot.' }, { status: 403 });
    }
    if (parsedEntryPass.kind === 'walk_in') {
      if (!parsedEntryPass.entryToken) {
        return jsonWithRequestContext(routeContext, {
          error: 'Legacy walk-in entry pass detected. Ask the customer to reopen the latest walk-in QR before scanning again.',
        }, { status: 400 });
      }
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
        p_entry_token: parsedEntryPass.kind === 'walk_in' ? parsedEntryPass.entryToken : null,
      }),
      cache: 'no-store',
    });

    const payload = await rpcResponse.json().catch(() => null);
    if (!rpcResponse.ok) {
      const message = payload?.message ?? payload?.error ?? 'Unable to confirm parking entry.';
      return jsonWithRequestContext(routeContext, { error: message }, { status: getConfirmationErrorStatus(message) });
    }

    const confirmation = Array.isArray(payload) ? payload[0] ?? null : payload;
    logOperatorRouteSuccess(routeContext, 'Confirmed parking entry', {
      reservationId,
      locationId: activeLocation.id,
      entryPassKind: parsedEntryPass.kind,
      legacyEntryPass: parsedEntryPass.isLegacy,
      idempotentReplay: Boolean(confirmation?.idempotent_replay),
    });

    return jsonWithRequestContext(routeContext, { ok: true, confirmation });
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to confirm parking entry', error, { reservationId });
    return jsonWithRequestContext(routeContext, { error: 'Unable to confirm parking entry.' }, { status: 500 });
  }
}
