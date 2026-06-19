export type ActiveOperatorLocation = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  pricing_mode?: string | null;
  flat_rate_amount?: number | null;
  fixed_rate_amount?: number | null;
  fixed_rate_interval_minutes?: number | null;
  first_period_minutes?: number | null;
  first_period_rate?: number | null;
  succeeding_rate_amount?: number | null;
  succeeding_rate_interval_minutes?: number | null;
  entry_grace_minutes?: number | null;
  exit_grace_minutes?: number | null;
  reservation_fee_30_minutes?: number | null;
  reservation_fee_60_minutes?: number | null;
  reservation_fee_120_minutes?: number | null;
  fixed_hourly_rate?: number | null;
  first_period_hours?: number | null;
  succeeding_hourly_rate?: number | null;
};

export const OPERATOR_LOCATION_COOKIE = 'operator_location_id';

export function getServiceHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  } as Record<string, string>;
}

function isMissingPricingColumnError(message: string) {
  return [
    'pricing_mode',
    'flat_rate_amount',
    'fixed_rate_amount',
    'fixed_rate_interval_minutes',
    'first_period_minutes',
    'first_period_rate',
    'succeeding_rate_amount',
    'succeeding_rate_interval_minutes',
    'entry_grace_minutes',
    'exit_grace_minutes',
    'reservation_fee_30_minutes',
    'reservation_fee_60_minutes',
    'reservation_fee_120_minutes',
    'fixed_hourly_rate',
    'first_period_hours',
    'succeeding_hourly_rate',
  ].some((column) => message.includes(column));
}

const OPERATOR_LOCATION_SELECT = 'id,name,address,city,pricing_mode,flat_rate_amount,fixed_rate_amount,fixed_rate_interval_minutes,first_period_minutes,first_period_rate,succeeding_rate_amount,succeeding_rate_interval_minutes,entry_grace_minutes,exit_grace_minutes,reservation_fee_30_minutes,reservation_fee_60_minutes,reservation_fee_120_minutes';
const LEGACY_OPERATOR_LOCATION_SELECT = 'id,name,address,city,pricing_mode,flat_rate_amount,fixed_hourly_rate,first_period_hours,first_period_rate,succeeding_hourly_rate,entry_grace_minutes,exit_grace_minutes,reservation_fee_30_minutes,reservation_fee_60_minutes,reservation_fee_120_minutes';

export async function readRestList<T>(response: Response): Promise<T[]> {
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as T[]) : [];
}

export async function readRestFirst<T>(response: Response): Promise<T | null> {
  const rows = await readRestList<T>(response);
  return rows[0] ?? null;
}

export function pickOperatorLocation<T extends Pick<ActiveOperatorLocation, 'id'>>(
  locations: T[],
  selectedLocationId?: string | null,
): T | null {
  if (locations.length === 0) {
    return null;
  }

  if (selectedLocationId) {
    const matched = locations.find((location) => location.id === selectedLocationId);
    if (matched) {
      return matched;
    }
  }

  return locations[0] ?? null;
}

export function assertOperatorLocationRequest(activeLocationId: string, requestedLocationId?: string | null) {
  if (!requestedLocationId) {
    return;
  }

  if (requestedLocationId !== activeLocationId) {
    throw new Error('The requested location does not match the active operator location.');
  }
}

export async function fetchOperatorLocations(
  baseUrl: string,
  headers: Record<string, string>,
  select = OPERATOR_LOCATION_SELECT,
): Promise<ActiveOperatorLocation[]> {
  const response = await fetch(
    `${baseUrl}/rest/v1/locations?select=${select}&is_active=eq.true&order=created_at.asc`,
    { headers, cache: 'no-store' },
  );

  if (!response.ok) {
    const message = await response.text();
    if (!isMissingPricingColumnError(message)) {
      throw new Error(message);
    }

    const legacyResponse = await fetch(
      `${baseUrl}/rest/v1/locations?select=${LEGACY_OPERATOR_LOCATION_SELECT}&is_active=eq.true&order=created_at.asc`,
      { headers, cache: 'no-store' },
    );

    if (legacyResponse.ok) {
      return readRestList<ActiveOperatorLocation>(legacyResponse);
    }

    return readRestList<ActiveOperatorLocation>(await fetch(
      `${baseUrl}/rest/v1/locations?select=id,name,address,city&is_active=eq.true&order=created_at.asc`,
      { headers, cache: 'no-store' },
    ));
  }

  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as ActiveOperatorLocation[]) : [];
}

export async function fetchActiveOperatorLocation(
  baseUrl: string,
  headers: Record<string, string>,
  select = OPERATOR_LOCATION_SELECT,
): Promise<ActiveOperatorLocation | null> {
  const locations = await fetchOperatorLocations(baseUrl, headers, select);
  return pickOperatorLocation(locations);
}

export function buildInFilter(ids: string[]) {
  return ids.join(',');
}
