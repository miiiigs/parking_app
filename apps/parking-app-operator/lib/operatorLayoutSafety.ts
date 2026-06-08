import type { ParkingLotDefinition } from './parkingMap';
import { buildSlotInventorySyncPlan, type SlotSyncLiveSlot } from './operatorSlotSyncPlan';

export type LayoutObjectSummary = {
  slotCount: number;
  roadCount: number;
  nodeCount: number;
  arrowCount: number;
  totalObjectCount: number;
};

export type LayoutApplyImpactSummary = {
  draftSlotCount: number;
  liveSlotCount: number;
  unchangedCount: number;
  insertCount: number;
  updateCount: number;
  archiveCount: number;
  conflictingArchiveCount: number;
  temporaryRelabelCount: number;
};

export type LayoutRevisionRecord = {
  eventId: string;
  revisionId: string;
  action: 'save' | 'apply' | 'rollback';
  createdAt: string;
  actorName: string | null;
  locationId: string;
  locationName: string | null;
  slotCount: number;
  objectSummary: LayoutObjectSummary;
  impactSummary: LayoutApplyImpactSummary | null;
  layoutSnapshot: ParkingLotDefinition | null;
};

type LayoutRevisionEventRow = {
  id: string;
  event_type: string;
  created_at?: string | null;
  payload?: Record<string, unknown> | null;
};

type LayoutDraftSlot = {
  id: string;
  label: string;
  status: 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';
  x: number;
  y: number;
};

export function summarizeLayout(lot: ParkingLotDefinition): LayoutObjectSummary {
  const slotCount = lot.slots.length;
  const roadCount = lot.roads.length;
  const nodeCount = lot.nodes.length;
  const arrowCount = lot.arrows.length;

  return {
    slotCount,
    roadCount,
    nodeCount,
    arrowCount,
    totalObjectCount: slotCount + roadCount + nodeCount + arrowCount,
  };
}

export function buildLayoutApplyImpactSummary(
  lot: ParkingLotDefinition,
  locationId: string,
  liveSlots: SlotSyncLiveSlot[],
): LayoutApplyImpactSummary {
  const plan = buildSlotInventorySyncPlan(
    lot.slots.map<LayoutDraftSlot>((slot) => ({
      id: slot.id,
      label: slot.label,
      status: slot.status === 'blocked' || slot.status === 'disputed' ? slot.status : 'available',
      x: slot.x,
      y: slot.y,
    })),
    liveSlots,
    locationId,
  );

  return {
    draftSlotCount: lot.slots.length,
    liveSlotCount: liveSlots.length,
    unchangedCount: plan.matchedLiveIds.size - plan.updates.length,
    insertCount: plan.inserts.length,
    updateCount: plan.updates.length,
    archiveCount: plan.removedLiveSlots.length,
    conflictingArchiveCount: plan.conflictingRemovedSlotIds.size,
    temporaryRelabelCount: plan.temporaryRelabels.length,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLayoutObjectSummary(value: unknown): value is LayoutObjectSummary {
  if (!isObject(value)) {
    return false;
  }

  return ['slotCount', 'roadCount', 'nodeCount', 'arrowCount', 'totalObjectCount'].every(
    (key) => typeof value[key] === 'number',
  );
}

function isLayoutApplyImpactSummary(value: unknown): value is LayoutApplyImpactSummary {
  if (!isObject(value)) {
    return false;
  }

  return [
    'draftSlotCount',
    'liveSlotCount',
    'unchangedCount',
    'insertCount',
    'updateCount',
    'archiveCount',
    'conflictingArchiveCount',
    'temporaryRelabelCount',
  ].every((key) => typeof value[key] === 'number');
}

function isParkingLotDefinition(value: unknown): value is ParkingLotDefinition {
  if (!isObject(value)) {
    return false;
  }

  return Array.isArray(value.slots) && Array.isArray(value.roads) && Array.isArray(value.nodes) && Array.isArray(value.arrows);
}

export function parseLayoutRevisionEvent(row: LayoutRevisionEventRow): LayoutRevisionRecord | null {
  const payload = row.payload;
  if (!payload || !isObject(payload)) {
    return null;
  }

  const locationId = typeof payload.location_id === 'string' ? payload.location_id : null;
  if (!locationId) {
    return null;
  }

  const revisionId = typeof payload.revision_id === 'string' ? payload.revision_id : row.id;
  const createdAt = typeof row.created_at === 'string' ? row.created_at : new Date(0).toISOString();
  const actorName = typeof payload.operator === 'string' ? payload.operator : null;
  const locationName = typeof payload.location_name === 'string' ? payload.location_name : null;
  const slotCount = typeof payload.slot_count === 'number' ? payload.slot_count : 0;
  const action =
    row.event_type === 'layout_rolled_back'
      ? 'rollback'
      : row.event_type === 'map_applied'
        ? 'apply'
        : row.event_type === 'layout_saved'
          ? 'save'
          : null;

  if (!action) {
    return null;
  }

  const objectSummary = isLayoutObjectSummary(payload.layout_summary)
    ? payload.layout_summary
    : isParkingLotDefinition(payload.layout_snapshot)
      ? summarizeLayout(payload.layout_snapshot)
      : {
          slotCount,
          roadCount: 0,
          nodeCount: 0,
          arrowCount: 0,
          totalObjectCount: slotCount,
        };

  return {
    eventId: row.id,
    revisionId,
    action,
    createdAt,
    actorName,
    locationId,
    locationName,
    slotCount,
    objectSummary,
    impactSummary: isLayoutApplyImpactSummary(payload.impact_summary) ? payload.impact_summary : null,
    layoutSnapshot: isParkingLotDefinition(payload.layout_snapshot) ? payload.layout_snapshot : null,
  };
}
