import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { formatRouteValidationIssues, operatorSlotUpdateRouteRequestSchema } from '@/lib/operatorRouteSchemas';
import { findIdempotentOperatorEvent } from '@/lib/operatorIdempotency';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';

export async function PATCH(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/slots');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasOperatorCapability(operatorUser.role, 'edit-slot-status')) {
    return jsonWithRequestContext(routeContext, { error: 'Insufficient permissions for slot updates.' }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    return jsonWithRequestContext(routeContext, { error: 'Missing SUPABASE URL' }, { status: 500 });
  }

  if (!serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 403 });
  }

  const parsedBody = operatorSlotUpdateRouteRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    return jsonWithRequestContext(
      routeContext,
      {
        error: 'Invalid slot update request.',
        details: formatRouteValidationIssues(parsedBody.error.issues),
      },
      { status: 400 },
    );
  }

  const { slotId, updates } = parsedBody.data;

  const normalizedUpdates = { ...updates };

  if (normalizedUpdates.status === 'maintenance') {
    normalizedUpdates.status = 'blocked';
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  } as Record<string, string>;

  const locationContext = await resolveOperatorLocationContext();
  const activeLocation = locationContext.activeLocation;

  if (!activeLocation) {
    return jsonWithRequestContext(routeContext, { error: 'No active parking location found.' }, { status: 404 });
  }

  const existingSlotResponse = await fetch(
    `${url}/rest/v1/parking_slots?select=id,status,location_id&id=eq.${encodeURIComponent(String(slotId))}&limit=1`,
    {
      headers,
      cache: 'no-store',
    },
  );

  if (!existingSlotResponse.ok) {
    const txt = await existingSlotResponse.text().catch(() => 'unknown error');
    logOperatorRouteError(routeContext, 'Failed to inspect parking slot before update', txt, {
      slotId,
      locationId: activeLocation.id,
    });
    return jsonWithRequestContext(routeContext, { error: txt }, { status: 500 });
  }

  const existingSlotRows = (await existingSlotResponse.json().catch(() => [])) as Array<{ id: string; status: string; location_id: string }>;
  const existingSlot = existingSlotRows[0] ?? null;
  if (!existingSlot) {
    return jsonWithRequestContext(routeContext, { error: 'Parking slot not found.' }, { status: 404 });
  }

  if (existingSlot.location_id !== activeLocation.id) {
    return jsonWithRequestContext(routeContext, { error: 'Parking slot does not belong to the active operator location.' }, { status: 409 });
  }

  const previousStatus = existingSlot.status ?? null;
  const idempotencyReplay = await findIdempotentOperatorEvent({
    url,
    serviceRoleKey,
    eventTypes: ['slot_status_changed'],
    context: routeContext,
  });

  if (idempotencyReplay?.payload?.response_payload && typeof idempotencyReplay.payload.response_payload === 'object') {
    logOperatorRouteSuccess(routeContext, 'Replayed idempotent slot update', {
      slotId,
      locationId: activeLocation.id,
    });
    return jsonWithRequestContext(routeContext, {
      ...(idempotencyReplay.payload.response_payload as Record<string, unknown>),
      idempotentReplay: true,
    });
  }

  // Use PostgREST to update the parking_slots row
  const resp = await fetch(`${url}/rest/v1/parking_slots?id=eq.${encodeURIComponent(String(slotId))}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(normalizedUpdates),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => 'unknown error');
    logOperatorRouteError(routeContext, 'Failed to update parking slot status', txt, {
      slotId,
      locationId: activeLocation.id,
    });
    return jsonWithRequestContext(routeContext, { error: txt }, { status: 500 });
  }

  const payload = await resp.json().catch(() => null);
  const responsePayload = { ok: true, payload };

  await fetch(`${url}/rest/v1/operator_events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      slot_id: slotId,
      event_type: 'slot_status_changed',
      payload: {
        idempotency_key: routeContext.idempotencyKey,
        request_id: routeContext.requestId,
        status: normalizedUpdates.status,
        previous_status: previousStatus,
        operator: operatorUser.name,
        actor_user_id: operatorUser.id,
        actor_role: operatorUser.role,
        response_payload: responsePayload,
      },
    }),
  });

  logOperatorRouteSuccess(routeContext, 'Updated slot status', {
    slotId,
    locationId: activeLocation.id,
    previousStatus,
    nextStatus: normalizedUpdates.status,
  });

  return jsonWithRequestContext(routeContext, responsePayload);
}
