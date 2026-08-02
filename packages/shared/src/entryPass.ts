const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLOT_QR_TOKEN_PATTERN = /^[A-Za-z0-9-]{8,200}$/;
const WALK_IN_ENTRY_TOKEN_PATTERN = /^[A-Fa-f0-9]{24,128}$/;

export type ParsedEntryPass =
  | {
      kind: 'reservation';
      reservationId: string;
      slotQrToken: string | null;
      isLegacy: boolean;
    }
  | {
      kind: 'walk_in';
      reservationId: string;
      slotQrToken: null;
      entryToken: string | null;
      isLegacy: boolean;
    };

export function isUuidEntryId(value: string | null | undefined) {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim());
}

export function buildReservationEntryPass({
  reservationId,
  slotQrToken,
}: {
  reservationId: string;
  slotQrToken?: string | null;
}) {
  const normalizedReservationId = reservationId.trim();
  const normalizedSlotQrToken = slotQrToken?.trim() ?? '';

  if (normalizedSlotQrToken && SLOT_QR_TOKEN_PATTERN.test(normalizedSlotQrToken)) {
    return `reservation-entry|${normalizedReservationId}|${normalizedSlotQrToken}`;
  }

  return `reservation-entry|${normalizedReservationId}`;
}

export function buildWalkInEntryPass({
  reservationId,
  entryToken,
}: {
  reservationId: string;
  entryToken?: string | null;
}) {
  const normalizedReservationId = reservationId.trim();
  const normalizedEntryToken = entryToken?.trim() ?? '';

  if (normalizedEntryToken && WALK_IN_ENTRY_TOKEN_PATTERN.test(normalizedEntryToken)) {
    return `walkin-entry-pass|${normalizedReservationId}|${normalizedEntryToken}`;
  }

  return `walkin-entry-pass|${normalizedReservationId}`;
}

export function parseEntryPass(value: string | null | undefined): ParsedEntryPass | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (isUuidEntryId(normalized)) {
    return {
      kind: 'reservation',
      reservationId: normalized,
      slotQrToken: null,
      isLegacy: true,
    };
  }

  if (normalized.startsWith('walkin-entry-pass|')) {
    const payload = normalized.slice('walkin-entry-pass|'.length);
    const [reservationId, entryToken] = payload.split('|');
    const cleanedReservationId = reservationId?.trim() ?? '';
    const cleanedEntryToken = entryToken?.trim() ?? '';

    if (!isUuidEntryId(cleanedReservationId)) {
      return null;
    }

    if (cleanedEntryToken && !WALK_IN_ENTRY_TOKEN_PATTERN.test(cleanedEntryToken)) {
      return null;
    }

    return {
      kind: 'walk_in',
      reservationId: cleanedReservationId,
      slotQrToken: null,
      entryToken: cleanedEntryToken || null,
      isLegacy: !cleanedEntryToken,
    };
  }

  if (normalized.startsWith('reservation-entry|')) {
    const payload = normalized.slice('reservation-entry|'.length);
    const [reservationId, slotQrToken] = payload.split('|');
    const cleanedReservationId = reservationId?.trim() ?? '';
    const cleanedSlotQrToken = slotQrToken?.trim() ?? '';

    if (!isUuidEntryId(cleanedReservationId)) {
      return null;
    }

    if (cleanedSlotQrToken && !SLOT_QR_TOKEN_PATTERN.test(cleanedSlotQrToken)) {
      return null;
    }

    return {
      kind: 'reservation',
      reservationId: cleanedReservationId,
      slotQrToken: cleanedSlotQrToken || null,
      isLegacy: !cleanedSlotQrToken,
    };
  }

  return null;
}
