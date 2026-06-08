export type SlotSyncStatus = 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';

export type SlotSyncDraftSlot = {
  id: string;
  label: string;
  status: SlotSyncStatus;
  x: number;
  y: number;
};

export type SlotSyncLiveSlot = {
  id: string;
  label: string;
  status: SlotSyncStatus;
  displayOrder: number;
};

export type SlotSyncPlan = {
  updates: Array<{ id: string; currentLabel: string; slot_label: string; display_order: number }>;
  inserts: Array<{
    location_id: string;
    slot_label: string;
    display_order: number;
    status: SlotSyncStatus;
  }>;
  removedLiveSlots: SlotSyncLiveSlot[];
  temporaryRelabels: Array<{ id: string; slot_label: string }>;
  conflictingRemovedSlotIds: Set<string>;
  matchedLiveIds: Set<string>;
};

function parseSlotLabel(label: string) {
  const trimmed = label.trim();
  const match = trimmed.match(/^(.*?)(\d+)$/);

  return {
    prefix: match?.[1].trimEnd() || 'S',
    digits: match?.[2] ?? null,
    normalized: trimmed,
  };
}

function normalizeSlotLabelKey(label: string) {
  return label.trim().toLowerCase();
}

function pickCanonicalSlotPrefix(slots: SlotSyncDraftSlot[]) {
  const counts = new Map<string, number>();

  for (const slot of slots) {
    const prefix = parseSlotLabel(slot.label).prefix || 'S';
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  return ranked[0]?.[0] || 'S';
}

function sortSlotsForNumbering(slots: SlotSyncDraftSlot[]) {
  return [...slots].sort((left, right) => {
    if (Math.abs(left.y - right.y) > 24) {
      return left.y - right.y;
    }

    return left.x - right.x;
  });
}

function ensureUniqueDraftSlotLabels(slots: SlotSyncDraftSlot[]) {
  if (slots.length === 0) {
    return slots;
  }

  const normalizedLabels = slots.map((slot) => normalizeSlotLabelKey(parseSlotLabel(slot.label).normalized));
  const hasBlankLabels = normalizedLabels.some((label) => label.length === 0);
  const hasDuplicates = new Set(normalizedLabels).size !== normalizedLabels.length;

  if (!hasBlankLabels && !hasDuplicates) {
    return slots;
  }

  const orderedSlots = sortSlotsForNumbering(slots);
  const prefix = pickCanonicalSlotPrefix(slots);
  const padding = Math.max(
    2,
    ...slots.map((slot) => parseSlotLabel(slot.label).digits?.length ?? 0),
    String(slots.length).length,
  );
  const labelById = new Map(
    orderedSlots.map((slot, index) => [slot.id, `${prefix}${String(index + 1).padStart(padding, '0')}`]),
  );

  return slots.map((slot) => ({
    ...slot,
    label: labelById.get(slot.id) ?? slot.label,
  }));
}

export function buildTemporarySlotLabel(id: string) {
  return `__slot_tmp__${id}`;
}

export function buildArchivedSlotLabel(slot: SlotSyncLiveSlot) {
  return `Archived ${slot.id.slice(0, 8)}`;
}

export function buildSlotInventorySyncPlan(
  draftSlots: SlotSyncDraftSlot[],
  liveSlots: SlotSyncLiveSlot[],
  locationId: string,
): SlotSyncPlan {
  const uniqueDraftSlots = ensureUniqueDraftSlotLabels(draftSlots);
  const remainingLiveSlots = [...liveSlots];
  const matchedLiveIds = new Set<string>();
  const updates: SlotSyncPlan['updates'] = [];
  const inserts: SlotSyncPlan['inserts'] = [];

  uniqueDraftSlots.forEach((slot, index) => {
    const displayOrder = index + 1;
    const exactIdMatchIndex = remainingLiveSlots.findIndex((live) => live.id === slot.id);
    const labelMatchIndex =
      exactIdMatchIndex >= 0
        ? exactIdMatchIndex
        : remainingLiveSlots.findIndex((live) => normalizeSlotLabelKey(live.label) === normalizeSlotLabelKey(slot.label));
    const displayOrderMatchIndex =
      exactIdMatchIndex >= 0 || labelMatchIndex >= 0
        ? exactIdMatchIndex >= 0
          ? exactIdMatchIndex
          : labelMatchIndex
        : remainingLiveSlots.findIndex((live) => live.displayOrder === displayOrder);
    const matchIndex =
      exactIdMatchIndex >= 0 ? exactIdMatchIndex : labelMatchIndex >= 0 ? labelMatchIndex : displayOrderMatchIndex;
    const liveMatch = matchIndex >= 0 ? remainingLiveSlots.splice(matchIndex, 1)[0] : null;

    if (liveMatch) {
      matchedLiveIds.add(liveMatch.id);

      if (liveMatch.label !== slot.label || liveMatch.displayOrder !== displayOrder) {
        updates.push({
          id: liveMatch.id,
          currentLabel: liveMatch.label,
          slot_label: slot.label,
          display_order: displayOrder,
        });
      }

      return;
    }

    inserts.push({
      location_id: locationId,
      slot_label: slot.label,
      display_order: displayOrder,
      status: slot.status === 'blocked' || slot.status === 'disputed' ? slot.status : 'available',
    });
  });

  const removedLiveSlots = liveSlots.filter((slot) => !matchedLiveIds.has(slot.id));
  const desiredLabelKeys = new Set(uniqueDraftSlots.map((slot) => normalizeSlotLabelKey(slot.label)));
  const conflictingRemovedSlots = removedLiveSlots.filter((slot) => desiredLabelKeys.has(normalizeSlotLabelKey(slot.label)));
  const conflictingRemovedSlotIds = new Set(conflictingRemovedSlots.map((slot) => slot.id));
  const temporaryRelabels = [
    ...updates
      .filter((update) => normalizeSlotLabelKey(update.currentLabel) !== normalizeSlotLabelKey(update.slot_label))
      .map((update) => ({ id: update.id, slot_label: buildTemporarySlotLabel(update.id) })),
    ...conflictingRemovedSlots.map((slot) => ({ id: slot.id, slot_label: buildTemporarySlotLabel(slot.id) })),
  ];

  return {
    updates,
    inserts,
    removedLiveSlots,
    temporaryRelabels,
    conflictingRemovedSlotIds,
    matchedLiveIds,
  };
}
