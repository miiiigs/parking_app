import {
  applyLiveSlotStatuses,
  resolveRoadPoints,
  type ParkingLotDefinition,
  type ParkingMapArrowDirection,
  type ParkingSlotStatus,
} from './parkingMap';
import { getAdminServiceConfig } from './adminService';

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
};

type DraftItemLike =
  | { id: string; type: 'slot'; label: string; status: ParkingSlotStatus; x: number; y: number; rotation: number }
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
  | { id: string; type: 'entry' | 'exit'; label: string; x: number; y: number; rotation: number; direction: ParkingMapArrowDirection }
  | { id: string; type: 'arrow'; label: string; x: number; y: number; rotation: number };

export function lotDefinitionToDraftItems(lot: ParkingLotDefinition): DraftItemLike[] {
  const items: DraftItemLike[] = [];

  for (const node of lot.nodes) {
    if (node.kind === 'entry' || node.kind === 'exit') {
      items.push({
        id: node.id,
        type: node.kind,
        label: node.label,
        x: node.x,
        y: node.y,
        rotation: 0,
        direction: node.direction ?? (node.kind === 'entry' ? 'east' : 'west'),
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

export function normalizeLotForSave(lot: ParkingLotDefinition, locationId: string, liveSlots: SavedSlotRef[]): ParkingLotDefinition {
  const slots = lot.slots.map((slot) => {
    const live =
      liveSlots.find((entry) => entry.id === slot.id) ??
      liveSlots.find((entry) => entry.label.toLowerCase() === slot.label.toLowerCase());

    if (!live) {
      return slot;
    }

    return {
      ...slot,
      id: live.id,
      label: live.label,
      status: live.status,
      displayOrder: live.displayOrder,
    };
  });

  return {
    ...lot,
    id: locationId,
    slots,
    roads: lot.roads.map((road) => ({
      ...road,
      points: resolveRoadPoints(road),
    })),
  };
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

export async function fetchLotBuilderPersistedState(locationId?: string | null): Promise<LotBuilderPersistedState | null> {
  const config = getAdminServiceConfig();
  if (!config?.serviceRoleKey) {
    return null;
  }

  const headers = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  const locationResponse = await fetch(
    `${config.url}/rest/v1/locations?select=id,name${locationId ? `&id=eq.${locationId}` : '&is_active=eq.true'}&order=created_at.asc&limit=1`,
    { headers, cache: 'no-store' },
  );
  const location = await readJson<{ id: string; name: string }>(locationResponse);
  if (!location) {
    return null;
  }

  const slotResponse = await fetch(
    `${config.url}/rest/v1/parking_slots?select=id,slot_label,status,display_order&location_id=eq.${location.id}&order=display_order.asc`,
    { headers, cache: 'no-store' },
  );
  const slotRows = (await slotResponse.json()) as Array<{
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

  const layoutResponse = await fetch(
    `${config.url}/rest/v1/parking_lot_layouts?select=layout&location_id=eq.${location.id}&limit=1`,
    { headers, cache: 'no-store' },
  );
  const layoutRow = await readJson<{ layout: ParkingLotDefinition }>(layoutResponse);
  const layout = layoutRow?.layout ? applyLiveSlotStatuses(layoutRow.layout, liveSlots) : null;

  return {
    locationId: location.id,
    locationName: location.name,
    layout,
    liveSlots,
  };
}

export async function persistParkingLotLayout(lot: ParkingLotDefinition, locationId: string, liveSlots: SavedSlotRef[]) {
  const config = getAdminServiceConfig();
  if (!config?.serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in admin environment variables.');
  }

  const normalized = normalizeLotForSave(lot, locationId, liveSlots);
  const headers = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    'Content-Type': 'application/json',
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
