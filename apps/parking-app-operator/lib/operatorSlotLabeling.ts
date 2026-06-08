export type SlotLabelTarget = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export function parseSlotLabel(label: string) {
  const trimmed = label.trim();
  const match = trimmed.match(/^(.*?)(\d+)$/);

  return {
    prefix: match?.[1].trimEnd() || 'S',
    digits: match?.[2] ?? null,
    normalized: trimmed,
  };
}

export function normalizeSlotLabelKey(label: string) {
  return label.trim().toLowerCase();
}

export function formatSlotLabel(prefix: string, number: number, padding = 2) {
  return `${prefix}${String(number).padStart(padding, '0')}`;
}

export function pickCanonicalSlotPrefix<T extends Pick<SlotLabelTarget, 'label'>>(slots: T[]) {
  const counts = new Map<string, number>();

  for (const slot of slots) {
    const prefix = parseSlotLabel(slot.label).prefix || 'S';
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  return ranked[0]?.[0] || 'S';
}

export function sortSlotsForNumbering<T extends Pick<SlotLabelTarget, 'x' | 'y'>>(slots: T[]) {
  return [...slots].sort((left, right) => {
    if (Math.abs(left.y - right.y) > 24) {
      return left.y - right.y;
    }

    return left.x - right.x;
  });
}

export function buildSequentialSlotLabels<T extends SlotLabelTarget>(
  slots: T[],
  prefix: string,
  padding = Math.max(2, String(slots.length).length),
) {
  const orderedSlots = sortSlotsForNumbering(slots);
  const labelByOccurrence = new Map<string, string>();
  const occurrenceCounts = new Map<string, number>();

  orderedSlots.forEach((slot, index) => {
    const occurrence = (occurrenceCounts.get(slot.id) ?? 0) + 1;
    occurrenceCounts.set(slot.id, occurrence);
    labelByOccurrence.set(`${slot.id}::${occurrence}`, formatSlotLabel(prefix, index + 1, padding));
  });

  return labelByOccurrence;
}

export function renumberSlotLabels<T extends SlotLabelTarget>(
  slots: T[],
  prefix: string,
  padding = Math.max(2, String(slots.length).length),
) {
  const labelById = buildSequentialSlotLabels(slots, prefix, padding);
  const occurrenceCounts = new Map<string, number>();

  return slots.map((slot) => ({
    ...slot,
    label: (() => {
      const occurrence = (occurrenceCounts.get(slot.id) ?? 0) + 1;
      occurrenceCounts.set(slot.id, occurrence);
      return labelById.get(`${slot.id}::${occurrence}`) ?? slot.label;
    })(),
  }));
}

export function findDuplicateSlotLabels<T extends Pick<SlotLabelTarget, 'label'>>(slots: T[]) {
  const counts = new Map<string, number>();

  for (const slot of slots) {
    const key = normalizeSlotLabelKey(parseSlotLabel(slot.label).normalized);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([label]) => label);
}

export function ensureUniqueSlotLabels<T extends SlotLabelTarget>(slots: T[]): T[] {
  if (slots.length === 0) {
    return slots;
  }

  const normalizedLabels = slots.map((slot) => normalizeSlotLabelKey(parseSlotLabel(slot.label).normalized));
  const hasBlankLabels = normalizedLabels.some((label) => label.length === 0);
  const hasDuplicates = new Set(normalizedLabels).size !== normalizedLabels.length;

  if (!hasBlankLabels && !hasDuplicates) {
    return slots;
  }

  const prefix = pickCanonicalSlotPrefix(slots);
  const padding = Math.max(
    2,
    ...slots.map((slot) => parseSlotLabel(slot.label).digits?.length ?? 0),
    String(slots.length).length,
  );
  return renumberSlotLabels(slots, prefix, padding);
}
