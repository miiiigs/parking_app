import { getAdminServiceConfig } from './adminService';

export type AdminLocation = {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  is_active?: boolean;
};

export const ADMIN_LOCATION_COOKIE = 'admin_location_id';

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

export async function fetchAdminLocations(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<AdminLocation[]> {
  return readRestList<AdminLocation>(
    await fetch(
      `${baseUrl}/rest/v1/locations?select=id,name,code,address,city,is_active&is_active=eq.true&order=created_at.asc`,
      { headers, cache: 'no-store' },
    ),
  );
}

export function pickAdminLocation<T extends Pick<AdminLocation, 'id'>>(
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

export function getAdminServiceHeadersOrNull() {
  const config = getAdminServiceConfig();

  if (!config?.url || !config.serviceRoleKey) {
    return null;
  }

  return {
    config,
    headers: getServiceHeaders(config.serviceRoleKey),
  };
}
