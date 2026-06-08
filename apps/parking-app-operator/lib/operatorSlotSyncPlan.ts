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

function formatSlotLabel(prefix: string, number: number, padding = 2) {
  return `${prefix}${String(number).padStart(padding, '0')}`;
}

function buildSequentialSlotLabels(
  slots: SlotSyncDraftSlot[],
  prefix: string,
  padding = Math.max(2, String(slots.length).length),
) {
  const orderedSlots = sortSlotsForNumbering(slots);
  return new Map(
    orderedSlots.map((slot, index) => [slot.id, formatSlotLabel(prefix, index + 1, padding)]),
  );
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
  const labelById = buildSequentialSlotLabels(orderedSlots, prefix, padding);

  return slots.map((slot) => ({
    ...slot,
    label: labelById.get(slot.id) ?? slot.label,
  }));
}

export type DraftLiveSlotMatch = {
  draftSlot: SlotSyncDraftSlot;
  liveSlot: SlotSyncLiveSlot | null;
  displayOrder: number;
};

export function buildDraftLiveSlotMatches(
  draftSlots: SlotSyncDraftSlot[],
  liveSlots: SlotSyncLiveSlot[],
): DraftLiveSlotMatch[] {
  const remainingLiveSlots = [...liveSlots];
  const exactIdMatches = new Map<string, SlotSyncLiveSlot>();

  for (const draftSlot of draftSlots) {
    const liveIndex = remainingLiveSlots.findIndex((live) => live.id === draftSlot.id);
    if (liveIndex >= 0) {
      exactIdMatches.set(draftSlot.id, remainingLiveSlots.splice(liveIndex, 1)[0]);
    }
  }

  return draftSlots.map((draftSlot, index) => {
    const displayOrder = index + 1;
    const exactMatch = exactIdMatches.get(draftSlot.id);
    if (exactMatch) {
      return { draftSlot, liveSlot: exactMatch, displayOrder };
    }

    const displayOrderMatchIndex = remainingLiveSlots.findIndex((live) => live.displayOrder === displayOrder);
    if (displayOrderMatchIndex >= 0) {
      return { draftSlot, liveSlot: remainingLiveSlots.splice(displayOrderMatchIndex, 1)[0], displayOrder };
    }

    const labelMatchIndex = remainingLiveSlots.findIndex(
      (live) => normalizeSlotLabelKey(live.label) === normalizeSlotLabelKey(draftSlot.label),
    );
    if (labelMatchIndex >= 0) {
      return { draftSlot, liveSlot: remainingLiveSlots.splice(labelMatchIndex, 1)[0], displayOrder };
    }

    return { draftSlot, liveSlot: null, displayOrder };
  });
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
  const matchedLiveIds = new Set<string>();
  const updates: SlotSyncPlan['updates'] = [];
  const inserts: SlotSyncPlan['inserts'] = [];
  const matches = buildDraftLiveSlotMatches(uniqueDraftSlots, liveSlots);

  matches.forEach(({ draftSlot, liveSlot, displayOrder }) => {
    if (liveSlot) {
      matchedLiveIds.add(liveSlot.id);

      if (liveSlot.label !== draftSlot.label || liveSlot.displayOrder !== displayOrder) {
        updates.push({
          id: liveSlot.id,
          currentLabel: liveSlot.label,
          slot_label: draftSlot.label,
          display_order: displayOrder,
        });
      }

      return;
    }

    inserts.push({
      location_id: locationId,
      slot_label: draftSlot.label,
      display_order: displayOrder,
      status: draftSlot.status === 'blocked' || draftSlot.status === 'disputed' ? draftSlot.status : 'available',
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
