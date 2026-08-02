import {
  applyLiveSlotStatuses,
  resolveRoadPoints,
  type ParkingLotDefinition,
  type ParkingMapArrowDirection,
  type ParkingMapNodeKind,
  type ParkingSlotStatus,
} from './parkingMap';
import {
  ensureUniqueSlotLabels,
} from './operatorSlotLabeling';
import {
  fetchOperatorLocations,
  fetchActiveOperatorLocation,
  pickOperatorLocation,
} from './operatorLocation';
import {
  buildArchivedSlotLabel,
  buildDraftLiveSlotMatches,
  buildSlotInventorySyncPlan,
} from './operatorSlotSyncPlan';
import {
  parseLayoutRevisionEvent,
  type LayoutRevisionRecord,
} from './operatorLayoutSafety';
import { getOperatorSupabaseConfig } from './supabase';

export type SavedSlotRef = {
  id: string;
  label: string;
  status: ParkingSlotStatus;
  displayOrder: number;
};

export type LotBuilderPersistedState = {
  locationId: string;
  locationName: string;
  layout: ParkingLotDefinition | null;
  liveSlots: SavedSlotRef[];
  draftUpdatedAt: string | null;
  lastAppliedRevision: LayoutRevisionRecord | null;
  recentRevisions: LayoutRevisionRecord[];
};

type DraftItemLike =
  | { id: string; type: 'slot'; label: string; status: ParkingSlotStatus; x: number; y: number; rotation: number; width: number; height: number }
  | {
      id: string;
      type: 'road';
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      points: Array<{ x: number; y: number }>;
      roadKind: 'straight' | 'curve';
    }
  | { id: string; type: Extract<ParkingMapNodeKind, 'entry' | 'exit' | 'junction'>; label: string; x: number; y: number; rotation: number; direction: ParkingMapArrowDirection }
  | { id: string; type: 'arrow'; label: string; x: number; y: number; rotation: number };

export function lotDefinitionToDraftItems(lot: ParkingLotDefinition): DraftItemLike[] {
  const items: DraftItemLike[] = [];

  for (const node of lot.nodes) {
    if (node.kind === 'entry' || node.kind === 'exit' || node.kind === 'junction') {
      items.push({
        id: node.id,
        type: node.kind,
        label: node.label,
        x: node.x,
        y: node.y,
        rotation: 0,
        direction: node.direction ?? (node.kind === 'entry' ? 'east' : node.kind === 'exit' ? 'west' : 'north'),
      });
    }
  }

  for (const road of lot.roads) {
    items.push({
      id: road.id,
      type: 'road',
      roadKind: road.kind,
      label: road.label,
      x: road.x,
      y: road.y,
      width: road.width,
      height: road.height,
      rotation: road.rotation ?? 0,
      points: resolveRoadPoints(road).map((point) => ({ ...point })),
    });
  }

  for (const slot of lot.slots) {
    items.push({
      id: slot.id,
      type: 'slot',
      label: slot.label,
      status: slot.status,
      x: slot.x,
      y: slot.y,
      rotation: slot.rotation,
      width: slot.width ?? 64,
      height: slot.height ?? 124,
    });
  }

  for (const arrow of lot.arrows) {
    items.push({
      id: arrow.id,
      type: 'arrow',
      label: arrow.label,
      x: arrow.x,
      y: arrow.y,
      rotation: arrow.rotation,
    });
  }

  return items;
}

export function ensureUniqueLotSlotLabels(lot: ParkingLotDefinition): ParkingLotDefinition {
  const slots = lot.slots ?? [];
  if (slots.length === 0) {
    return lot;
  }

  return {
    ...lot,
    slots: ensureUniqueSlotLabels(slots),
  };
}

export function normalizeLotForSave(lot: ParkingLotDefinition, locationId: string, liveSlots: SavedSlotRef[]): ParkingLotDefinition {
  const uniqueLot = ensureUniqueLotSlotLabels(lot);
  const matches = buildDraftLiveSlotMatches(
    uniqueLot.slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      status: slot.status,
      x: slot.x,
      y: slot.y,
    })),
    liveSlots,
  );
  const liveByDraftId = new Map(
    matches
      .filter((match) => Boolean(match.liveSlot))
      .map((match) => [match.draftSlot.id, match.liveSlot]),
  );
  const slots = uniqueLot.slots.map((slot, index) => {
    const live = liveByDraftId.get(slot.id);

    if (!live) {
      return {
        ...slot,
        displayOrder: index + 1,
      };
    }

    return {
      ...slot,
      id: live.id,
      status: live.status,
      displayOrder: index + 1,
    };
  });

  return {
    ...uniqueLot,
    id: locationId,
    slots,
    roads: uniqueLot.roads.map((road) => ({
      ...road,
      points: resolveRoadPoints(road),
    })),
  };
}

function getServiceHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  } as Record<string, string>;
}

async function readRestList<T>(response: Response): Promise<T[]> {
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as T[]) : [];
}

function buildSlotQrToken(label: string) {
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'slot';
  return `${normalizedLabel}-${crypto.randomUUID()}`;
}

async function fetchLiveSlotsForLocation(
  url: string,
  headers: Record<string, string>,
  locationId: string,
): Promise<SavedSlotRef[]> {
  const slotRows = await readRestList<{
    id: string;
    slot_label: string;
    status: ParkingSlotStatus;
    display_order: number;
  }>(
    await fetch(
      `${url}/rest/v1/parking_slots?select=id,slot_label,status,display_order&location_id=eq.${locationId}&slot_kind=eq.standard&order=display_order.asc`,
      { headers, cache: 'no-store' },
    ),
  );

  return slotRows.map((slot) => ({
    id: slot.id,
    label: slot.slot_label,
    status: slot.status,
    displayOrder: slot.display_order,
  }));
}

async function patchParkingSlot(
  url: string,
  headers: Record<string, string>,
  id: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch(`${url}/rest/v1/parking_slots?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      ...headers,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function syncOperatorSlotInventory(
  lot: ParkingLotDefinition,
  locationId: string,
  liveSlots: SavedSlotRef[],
): Promise<SavedSlotRef[]> {
  const uniqueLot = ensureUniqueLotSlotLabels(lot);
  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    throw new Error('Missing operator Supabase service configuration.');
  }

  const headers = getServiceHeaders(config.serviceRoleKey);
  const plan = buildSlotInventorySyncPlan(
    uniqueLot.slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      status: slot.status,
      x: slot.x,
      y: slot.y,
    })),
    liveSlots,
    locationId,
  );
  const inserts = plan.inserts.map((insert) => ({
    ...insert,
    qr_token: buildSlotQrToken(insert.slot_label),
  }));

  for (const relabel of plan.temporaryRelabels) {
    await patchParkingSlot(config.url, headers, relabel.id, {
      slot_label: relabel.slot_label,
    });
  }

  if (plan.updates.length > 0) {
    for (const update of plan.updates) {
      await patchParkingSlot(config.url, headers, update.id, {
        slot_label: update.slot_label,
        display_order: update.display_order,
      });
    }
  }

  if (inserts.length > 0) {
    const insertResponse = await fetch(`${config.url}/rest/v1/parking_slots`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(inserts),
    });

    if (!insertResponse.ok) {
      throw new Error(await insertResponse.text());
    }
  }

  if (plan.removedLiveSlots.length > 0) {
    const removedIds = plan.removedLiveSlots.map((slot) => slot.id);
    const inClause = removedIds.join(',');
    const [reservationRefs, sessionRefs] = await Promise.all([
      readRestList<{ slot_id: string }>(
        await fetch(`${config.url}/rest/v1/reservations?select=slot_id&slot_id=in.(${inClause})`, {
          headers,
          cache: 'no-store',
        }),
      ),
      readRestList<{ slot_id: string }>(
        await fetch(`${config.url}/rest/v1/parking_sessions?select=slot_id&slot_id=in.(${inClause})`, {
          headers,
          cache: 'no-store',
        }),
      ),
    ]);

    const referencedSlotIds = new Set([
      ...reservationRefs.map((row) => row.slot_id),
      ...sessionRefs.map((row) => row.slot_id),
    ]);
    const deletableIds = removedIds.filter((id) => !referencedSlotIds.has(id));
    const blockedIds = removedIds.filter((id) => referencedSlotIds.has(id));

    if (deletableIds.length > 0) {
      const deleteResponse = await fetch(`${config.url}/rest/v1/parking_slots?id=in.(${deletableIds.join(',')})`, {
        method: 'DELETE',
        headers: {
          ...headers,
          Prefer: 'return=minimal',
        },
      });

      if (!deleteResponse.ok) {
        throw new Error(await deleteResponse.text());
      }
    }

    if (blockedIds.length > 0) {
      await Promise.all(
        blockedIds.map((id) =>
          patchParkingSlot(config.url, headers, id, {
            status: 'blocked',
            ...(plan.conflictingRemovedSlotIds.has(id)
              ? {
                  slot_label: buildArchivedSlotLabel(plan.removedLiveSlots.find((slot) => slot.id === id) ?? {
                      id,
                      label: '',
                      status: 'blocked',
                      displayOrder: 0,
                    }),
                }
              : {}),
          }),
        ),
      );
    }
  }

  return fetchLiveSlotsForLocation(config.url, headers, locationId);
}

async function readJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as unknown;
  if (!payload) {
    return null;
  }

  if (Array.isArray(payload)) {
    return (payload[0] as T) ?? null;
  }

  return payload as T;
}

export async function fetchOperatorLotBuilderState(selectedLocationId?: string | null): Promise<LotBuilderPersistedState | null> {
  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return null;
  }

  const headers = getServiceHeaders(config.serviceRoleKey);
  const locations = await fetchOperatorLocations(config.url, headers, 'id,name');
  const location = pickOperatorLocation(locations, selectedLocationId) ?? await fetchActiveOperatorLocation(config.url, headers, 'id,name');
  if (!location) {
    return null;
  }

  const slotResponse = await fetch(
    `${config.url}/rest/v1/parking_slots?select=id,slot_label,status,display_order&location_id=eq.${location.id}&slot_kind=eq.standard&order=display_order.asc`,
    { headers, cache: 'no-store' },
  );
  const slotRows = (await slotResponse.json().catch(() => [])) as Array<{
    id: string;
    slot_label: string;
    status: ParkingSlotStatus;
    display_order: number;
  }>;

  const liveSlots = Array.isArray(slotRows)
    ? slotRows.map((slot) => ({
        id: slot.id,
        label: slot.slot_label,
        status: slot.status,
        displayOrder: slot.display_order,
      }))
    : [];

  const [layoutResponse, revisionResponse] = await Promise.all([
    fetch(
      `${config.url}/rest/v1/parking_lot_layouts?select=layout,updated_at&location_id=eq.${location.id}&limit=1`,
      { headers, cache: 'no-store' },
    ),
    fetch(
      `${config.url}/rest/v1/operator_events?select=id,event_type,payload,created_at&event_type=in.(layout_saved,map_applied,layout_rolled_back)&order=created_at.desc&limit=40`,
      { headers, cache: 'no-store' },
    ),
  ]);
  const layoutRow = await readJson<{ layout: ParkingLotDefinition; updated_at: string | null }>(layoutResponse);
  const revisionRows = await readRestList<{
    id: string;
    event_type: string;
    created_at: string | null;
    payload: Record<string, unknown> | null;
  }>(revisionResponse);
  const layout = layoutRow?.layout ? applyLiveSlotStatuses(layoutRow.layout, liveSlots) : null;
  const recentRevisions = revisionRows
    .map((row) => parseLayoutRevisionEvent(row))
    .filter((row): row is LayoutRevisionRecord => Boolean(row && row.locationId === location.id));
  const lastAppliedRevision = recentRevisions.find((revision) => revision.action !== 'save') ?? null;

  return {
    locationId: location.id,
    locationName: location.name,
    layout,
    liveSlots,
    draftUpdatedAt: layoutRow?.updated_at ?? null,
    lastAppliedRevision,
    recentRevisions,
  };
}

export async function persistOperatorLotLayout(lot: ParkingLotDefinition, locationId: string, liveSlots: SavedSlotRef[]) {
  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    throw new Error('Missing operator Supabase service configuration.');
  }

  const normalized = normalizeLotForSave(lot, locationId, liveSlots);
  const headers = {
    ...getServiceHeaders(config.serviceRoleKey),
    Prefer: 'resolution=merge-duplicates,return=representation',
  };

  const response = await fetch(`${config.url}/rest/v1/parking_lot_layouts?on_conflict=location_id`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      location_id: locationId,
      layout: normalized,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return normalized;
}
