import { NextResponse } from 'next/server';

import { fetchOperatorLotBuilderState, persistOperatorLotLayout, syncOperatorSlotInventory } from '@/lib/parkingLotLayout';
import { buildLayoutApplyImpactSummary, summarizeLayout } from '@/lib/operatorLayoutSafety';
import { assertOperatorLocationRequest } from '@/lib/operatorLocation';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { getCurrentOperatorUser } from '@/lib/operatorAuth';

export async function GET() {
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const locationContext = await resolveOperatorLocationContext();
    const activeLocation = locationContext.activeLocation;

    if (!activeLocation) {
      return NextResponse.json({ error: 'No active parking location found.' }, { status: 404 });
    }

    const state = await fetchOperatorLotBuilderState(activeLocation.id);

    if (!state) {
      return NextResponse.json({ error: 'No active parking location found.' }, { status: 404 });
    }

    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load parking lot layout.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { locationId, layout, applyMap, previewOnly, rollbackToRevisionId } = body ?? {};

  if (!locationId || !layout) {
    return NextResponse.json({ error: 'locationId and layout are required' }, { status: 400 });
  }

  const locationContext = await resolveOperatorLocationContext();
  const activeLocation = locationContext.activeLocation;
  if (!activeLocation) {
    return NextResponse.json({ error: 'No active parking location found.' }, { status: 404 });
  }

  try {
    assertOperatorLocationRequest(activeLocation.id, locationId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Location mismatch.' },
      { status: 409 },
    );
  }

  const state = await fetchOperatorLotBuilderState(activeLocation.id);
  if (!state) {
    return NextResponse.json({ error: 'No active parking location found.' }, { status: 404 });
  }

  const layoutSummary = summarizeLayout(layout);
  const impactSummary = applyMap
    ? buildLayoutApplyImpactSummary(layout, state.locationId, state.liveSlots)
    : null;

  if (previewOnly) {
    return NextResponse.json({
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
    return NextResponse.json({ error: 'Missing SUPABASE URL' }, { status: 500 });
  }

  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 403 });
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  } as Record<string, string>;

  try {
    const syncedLiveSlots = applyMap
      ? await syncOperatorSlotInventory(layout, state.locationId, state.liveSlots)
      : state.liveSlots;
    const normalized = await persistOperatorLotLayout(layout, state.locationId, syncedLiveSlots);
    const createdAt = new Date().toISOString();
    const revisionId = crypto.randomUUID();
    const eventType = rollbackToRevisionId
      ? 'layout_rolled_back'
      : applyMap
        ? 'map_applied'
        : 'layout_saved';

    await fetch(`${url}/rest/v1/operator_events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: eventType,
        payload: {
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
          confirmed_at: createdAt,
          action_scope: 'location',
          source_action: rollbackToRevisionId ? 'rollback' : applyMap ? 'apply' : 'save',
          rollback_to_revision_id: rollbackToRevisionId ?? null,
        },
      }),
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save parking lot layout.' },
      { status: 500 },
    );
  }
}
