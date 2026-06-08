export type ActiveOperatorLocation = {
  id: string;
  name: string;
  address?: string;
  city?: string;
};

export const OPERATOR_LOCATION_COOKIE = 'operator_location_id';

export function getServiceHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  } as Record<string, string>;
}

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
  select = 'id,name,address,city',
): Promise<ActiveOperatorLocation[]> {
  return readRestList<ActiveOperatorLocation>(
    await fetch(
      `${baseUrl}/rest/v1/locations?select=${select}&is_active=eq.true&order=created_at.asc`,
      { headers, cache: 'no-store' },
    ),
  );
}

export async function fetchActiveOperatorLocation(
  baseUrl: string,
  headers: Record<string, string>,
  select = 'id,name,address,city',
): Promise<ActiveOperatorLocation | null> {
  const locations = await fetchOperatorLocations(baseUrl, headers, select);
  return pickOperatorLocation(locations);
}

export function buildInFilter(ids: string[]) {
  return ids.join(',');
}
