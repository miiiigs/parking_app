import { fetchOperatorLotBuilderState, persistOperatorLotLayout, syncOperatorSlotInventory } from '@/lib/parkingLotLayout';
import { buildLayoutApplyImpactSummary, summarizeLayout } from '@/lib/operatorLayoutSafety';
import { assertOperatorLocationRequest } from '@/lib/operatorLocation';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { findIdempotentOperatorEvent } from '@/lib/operatorIdempotency';
import {
  createOperatorRouteContext,
  jsonWithRequestContext,
  logOperatorRouteError,
  logOperatorRouteSuccess,
} from '@/lib/operatorRequestContext';
import { formatRouteValidationIssues, operatorLayoutRouteRequestSchema } from '@/lib/operatorRouteSchemas';
import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { hasOperatorCapability } from '@/lib/operatorPermissions';

export async function GET(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/layout');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasOperatorCapability(operatorUser.role, 'edit-map-layout')) {
    return jsonWithRequestContext(routeContext, { error: 'Insufficient permissions for map layout changes.' }, { status: 403 });
  }

  try {
    const locationContext = await resolveOperatorLocationContext();
    const activeLocation = locationContext.activeLocation;

    if (!activeLocation) {
      return jsonWithRequestContext(routeContext, { error: 'No active parking location found.' }, { status: 404 });
    }

    const state = await fetchOperatorLotBuilderState(activeLocation.id);

    if (!state) {
      return jsonWithRequestContext(routeContext, { error: 'No active parking location found.' }, { status: 404 });
    }

    logOperatorRouteSuccess(routeContext, 'Loaded operator layout', {
      locationId: activeLocation.id,
      slotCount: Array.isArray(state.layout?.slots) ? state.layout.slots.length : 0,
    });

    return jsonWithRequestContext(routeContext, state);
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to load operator layout', error);
    return jsonWithRequestContext(
      routeContext,
      { error: error instanceof Error ? error.message : 'Failed to load parking lot layout.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/layout');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  const parsedBody = operatorLayoutRouteRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    return jsonWithRequestContext(
      routeContext,
      {
        error: 'Invalid map layout request.',
        details: formatRouteValidationIssues(parsedBody.error.issues),
      },
      { status: 400 },
    );
  }

  const { locationId, layout, applyMap, previewOnly, rollbackToRevisionId } = parsedBody.data;

  const locationContext = await resolveOperatorLocationContext();
  const activeLocation = locationContext.activeLocation;
  if (!activeLocation) {
    return jsonWithRequestContext(routeContext, { error: 'No active parking location found.' }, { status: 404 });
  }

  try {
    assertOperatorLocationRequest(activeLocation.id, locationId);
  } catch (error) {
    return jsonWithRequestContext(
      routeContext,
      { error: error instanceof Error ? error.message : 'Location mismatch.' },
      { status: 409 },
    );
  }

  const state = await fetchOperatorLotBuilderState(activeLocation.id);
  if (!state) {
    return jsonWithRequestContext(routeContext, { error: 'No active parking location found.' }, { status: 404 });
  }

  const layoutSummary = summarizeLayout(layout);
  const impactSummary = applyMap
    ? buildLayoutApplyImpactSummary(layout, state.locationId, state.liveSlots)
    : null;

  if (previewOnly) {
    return jsonWithRequestContext(routeContext, {
      ok: true,
      preview: {
        locationId: state.locationId,
        locationName: state.locationName,
        layoutSummary,
        impactSummary,
      },
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    return jsonWithRequestContext(routeContext, { error: 'Missing SUPABASE URL' }, { status: 500 });
  }

  if (!serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 403 });
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  } as Record<string, string>;

  try {
    const eventType = rollbackToRevisionId
      ? 'layout_rolled_back'
      : applyMap
        ? 'map_applied'
        : 'layout_saved';
    const replayEvent = await findIdempotentOperatorEvent({
      url,
      serviceRoleKey,
      eventTypes: ['layout_saved', 'map_applied', 'layout_rolled_back'],
      context: routeContext,
    });

    if (replayEvent?.payload?.response_payload && typeof replayEvent.payload.response_payload === 'object') {
      logOperatorRouteSuccess(routeContext, 'Replayed idempotent operator layout write', {
        locationId: state.locationId,
        eventType,
      });

      return jsonWithRequestContext(routeContext, {
        ...(replayEvent.payload.response_payload as Record<string, unknown>),
        idempotentReplay: true,
      });
    }

    const syncedLiveSlots = applyMap
      ? await syncOperatorSlotInventory(layout, state.locationId, state.liveSlots)
      : state.liveSlots;
    const normalized = await persistOperatorLotLayout(layout, state.locationId, syncedLiveSlots);
    const createdAt = new Date().toISOString();
    const revisionId = crypto.randomUUID();
    const responsePayload = {
      ok: true,
      payload: normalized,
      applied: Boolean(applyMap),
      liveSlots: syncedLiveSlots,
      draftUpdatedAt: createdAt,
      revision: {
        revisionId,
        action: rollbackToRevisionId ? 'rollback' : applyMap ? 'apply' : 'save',
        createdAt,
        slotCount: normalized.slots.length,
        layoutSummary: summarizeLayout(normalized),
        impactSummary,
      },
    };

    await fetch(`${url}/rest/v1/operator_events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: eventType,
        payload: {
          idempotency_key: routeContext.idempotencyKey,
          request_id: routeContext.requestId,
          revision_id: revisionId,
          operator: operatorUser.name,
          actor_user_id: operatorUser.id,
          actor_role: operatorUser.role,
          location_id: state.locationId,
          location_name: state.locationName,
          slot_count: Array.isArray(normalized.slots) ? normalized.slots.length : 0,
          layout_summary: summarizeLayout(normalized),
          impact_summary: impactSummary,
          layout_snapshot: normalized,
          response_payload: responsePayload,
          confirmed_at: createdAt,
          action_scope: 'location',
          source_action: rollbackToRevisionId ? 'rollback' : applyMap ? 'apply' : 'save',
          rollback_to_revision_id: rollbackToRevisionId ?? null,
        },
      }),
    });

    logOperatorRouteSuccess(routeContext, 'Saved operator layout', {
      locationId: state.locationId,
      eventType,
      slotCount: normalized.slots.length,
    });

    return jsonWithRequestContext(routeContext, responsePayload);
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to save operator layout', error, {
      locationId: state.locationId,
      applyMap: Boolean(applyMap),
    });
    return jsonWithRequestContext(
      routeContext,
      { error: error instanceof Error ? error.message : 'Failed to save parking lot layout.' },
      { status: 500 },
    );
  }
}
