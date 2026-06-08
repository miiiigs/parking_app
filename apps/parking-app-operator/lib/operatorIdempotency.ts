import type { OperatorRouteRequestContext } from './operatorRequestContext';
import { buildInFilter, getServiceHeaders, readRestList } from './operatorLocation';

type OperatorEventLookup = {
  url: string;
  serviceRoleKey: string;
  eventTypes: string[];
  context: OperatorRouteRequestContext;
};

type OperatorEventRow = {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export async function findIdempotentOperatorEvent({
  url,
  serviceRoleKey,
  eventTypes,
  context,
}: OperatorEventLookup): Promise<OperatorEventRow | null> {
  if (!context.idempotencyKey || eventTypes.length === 0) {
    return null;
  }

  const headers = getServiceHeaders(serviceRoleKey);
  const eventTypeFilter = buildInFilter(eventTypes);
  const encodedKey = encodeURIComponent(context.idempotencyKey);
  const rows = await readRestList<OperatorEventRow>(
    await fetch(
      `${url}/rest/v1/operator_events?select=id,event_type,payload,created_at&event_type=in.(${eventTypeFilter})&payload->>idempotency_key=eq.${encodedKey}&order=created_at.desc&limit=1`,
      { headers, cache: 'no-store' },
    ),
  );

  return rows[0] ?? null;
}

export function buildIdempotencyReplayResponse<T>(event: OperatorEventRow | null): T | null {
  const payload = event?.payload;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const responsePayload = payload.response_payload;
  return responsePayload && typeof responsePayload === 'object' ? (responsePayload as T) : null;
}
