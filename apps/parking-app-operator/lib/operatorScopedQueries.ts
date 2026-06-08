import {
  buildInFilter,
  getServiceHeaders,
  readRestList,
} from './operatorLocation';

export type ScopedSlotRow = {
  id: string;
  slot_label: string;
  status: string;
  display_order: number;
};

export type ScopedReservationRow = {
  id: string;
  slot_id: string;
  plate_number: string;
  status: string;
  reserved_at: string;
  expires_at: string;
  reservation_fee: number;
};

export type ScopedSessionRow = {
  id: string;
  reservation_id: string | null;
  slot_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  billed_minutes: number | null;
};

export type ScopedPaymentRow = {
  id: string;
  reservation_id: string | null;
  session_id: string | null;
  status: string;
  amount: number;
  paid_at: string | null;
  created_at: string;
};

export type ScopedAdminAuditRow = {
  id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ScopedOperatorEventRow = {
  id: string;
  slot_id: string | null;
  reservation_id: string | null;
  session_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const REST_PAGE_SIZE = 500;
const FILTER_BATCH_SIZE = 150;

function withQueryValue(url: string, key: string, value: string | number) {
  return `${url}${url.includes('?') ? '&' : '?'}${key}=${value}`;
}

function chunkValues(values: string[], size = FILTER_BATCH_SIZE) {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function readPagedRestList<T>(
  url: string,
  headers: Record<string, string>,
  pageSize = REST_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const page = await readRestList<T>(
      await fetch(withQueryValue(withQueryValue(url, 'limit', pageSize), 'offset', offset), {
        headers,
        cache: 'no-store',
      }),
    );

    rows.push(...page);
    if (page.length < pageSize) {
      return rows;
    }
    offset += page.length;
  }
}

export async function readBatchedInFilterList<T>(
  baseUrl: string,
  filterKey: string,
  ids: string[],
  headers: Record<string, string>,
): Promise<T[]> {
  if (ids.length === 0) {
    return [];
  }

  const resultSets = await Promise.all(
    chunkValues(ids).map((batch) =>
      readPagedRestList<T>(`${baseUrl}&${filterKey}=in.(${buildInFilter(batch)})`, headers),
    ),
  );

  return resultSets.flat();
}

export async function fetchScopedSlotRows(
  url: string,
  serviceRoleKey: string,
  locationId: string,
) {
  const headers = getServiceHeaders(serviceRoleKey);
  return readPagedRestList<ScopedSlotRow>(
    `${url}/rest/v1/parking_slots?select=id,slot_label,status,display_order&location_id=eq.${locationId}&order=display_order.asc`,
    headers,
  );
}

export async function fetchScopedReservationsWithRelations(
  url: string,
  serviceRoleKey: string,
  slotRows: ScopedSlotRow[],
) {
  const headers = getServiceHeaders(serviceRoleKey);
  const slotIds = slotRows.map((slot) => slot.id);

  const reservationRows = await readBatchedInFilterList<ScopedReservationRow>(
    `${url}/rest/v1/reservations?select=id,slot_id,plate_number,status,reserved_at,expires_at,reservation_fee&order=reserved_at.desc`,
    'slot_id',
    slotIds,
    headers,
  );

  const reservationIds = reservationRows.map((reservation) => reservation.id);
  const sessionRows = await readBatchedInFilterList<ScopedSessionRow>(
    `${url}/rest/v1/parking_sessions?select=id,reservation_id,slot_id,started_at,ended_at,status,billed_minutes&order=started_at.desc`,
    'slot_id',
    slotIds,
    headers,
  );

  const sessionIds = sessionRows.map((session) => session.id);
  const paymentResults = await Promise.all([
    readBatchedInFilterList<ScopedPaymentRow>(
      `${url}/rest/v1/payments?select=id,reservation_id,session_id,status,amount,paid_at,created_at&order=created_at.desc`,
      'reservation_id',
      reservationIds,
      headers,
    ),
    readBatchedInFilterList<ScopedPaymentRow>(
      `${url}/rest/v1/payments?select=id,reservation_id,session_id,status,amount,paid_at,created_at&order=created_at.desc`,
      'session_id',
      sessionIds,
      headers,
    ),
  ]);

  const paymentRows = Array.from(new Map(paymentResults.flat().map((payment) => [payment.id, payment])).values());

  return {
    reservationRows,
    sessionRows,
    paymentRows,
  };
}

export async function fetchScopedAuditSourceRows(
  url: string,
  serviceRoleKey: string,
  locationId: string,
  slotRows: ScopedSlotRow[],
  reservationRows: ScopedReservationRow[],
  sessionRows: ScopedSessionRow[],
  paymentRows: ScopedPaymentRow[],
) {
  const headers = getServiceHeaders(serviceRoleKey);
  const slotIds = new Set(slotRows.map((slot) => slot.id));
  const reservationIds = new Set(reservationRows.map((row) => row.id));
  const sessionIds = new Set(sessionRows.map((row) => row.id));
  const paymentIds = new Set(paymentRows.map((row) => row.id));

  const [adminAuditRows, operatorEventRows, actorRoleRows] = await Promise.all([
    readPagedRestList<ScopedAdminAuditRow>(
      `${url}/rest/v1/admin_audit_log?select=id,table_name,record_id,action,actor_user_id,metadata,created_at&order=created_at.desc`,
      headers,
    ),
    readPagedRestList<ScopedOperatorEventRow>(
      `${url}/rest/v1/operator_events?select=id,slot_id,reservation_id,session_id,event_type,payload,created_at&order=created_at.desc`,
      headers,
    ),
    readPagedRestList<{ user_id: string; display_name: string | null; role: string }>(
      `${url}/rest/v1/admin_user_roles?select=user_id,display_name,role`,
      headers,
    ),
  ]);

  const actorNameByUserId = new Map(
    actorRoleRows.map((row) => [row.user_id, row.display_name ?? row.role.toUpperCase()]),
  );

  const filteredAdminAuditRows = adminAuditRows.filter((row) => {
    const metadataLocationId =
      typeof row.metadata?.location_id === 'string'
        ? row.metadata.location_id
        : typeof row.metadata?.locationId === 'string'
          ? row.metadata.locationId
          : null;

    if (metadataLocationId === locationId) {
      return true;
    }

    if (row.table_name === 'parking_slots' && row.record_id) {
      return slotIds.has(row.record_id);
    }
    if (row.table_name === 'reservations' && row.record_id) {
      return reservationIds.has(row.record_id);
    }
    if (row.table_name === 'parking_sessions' && row.record_id) {
      return sessionIds.has(row.record_id);
    }
    if (row.table_name === 'payments' && row.record_id) {
      return paymentIds.has(row.record_id);
    }

    return false;
  });

  const filteredOperatorEventRows = operatorEventRows.filter((row) => {
    if (row.slot_id && slotIds.has(row.slot_id)) {
      return true;
    }
    if (row.reservation_id && reservationIds.has(row.reservation_id)) {
      return true;
    }
    if (row.session_id && sessionIds.has(row.session_id)) {
      return true;
    }
    const payloadLocationId =
      typeof row.payload?.location_id === 'string'
        ? row.payload.location_id
        : typeof row.payload?.locationId === 'string'
          ? row.payload.locationId
          : null;

    return payloadLocationId === locationId;
  });

  return {
    adminAuditRows: filteredAdminAuditRows,
    operatorEventRows: filteredOperatorEventRows,
    actorNameByUserId,
  };
}
