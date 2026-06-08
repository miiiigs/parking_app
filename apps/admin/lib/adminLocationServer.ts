import { cookies } from 'next/headers';

import { getAdminServiceConfig } from './adminService';
import {
  ADMIN_LOCATION_COOKIE,
  fetchAdminLocations,
  getServiceHeaders,
  pickAdminLocation,
  type AdminLocation,
} from './adminLocation';

const LOCATION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

export type AdminLocationContext = {
  locations: AdminLocation[];
  activeLocation: AdminLocation | null;
  selectedLocationId: string | null;
};

export async function resolveAdminLocationContext(): Promise<AdminLocationContext> {
  const config = getAdminServiceConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return {
      locations: [],
      activeLocation: null,
      selectedLocationId: null,
    };
  }

  const cookieStore = await cookies();
  const selectedLocationId = cookieStore.get(ADMIN_LOCATION_COOKIE)?.value ?? null;
  const locations = await fetchAdminLocations(config.url, getServiceHeaders(config.serviceRoleKey));
  const activeLocation = pickAdminLocation(locations, selectedLocationId);

  return {
    locations,
    activeLocation,
    selectedLocationId: activeLocation?.id ?? null,
  };
}

export async function setAdminLocationSelection(locationId: string) {
  const context = await resolveAdminLocationContext();
  const cookieStore = await cookies();
  const activeLocation = context.locations.find((location) => location.id === locationId) ?? null;

  if (!activeLocation) {
    throw new Error('Unknown or inactive admin location.');
  }

  cookieStore.set(ADMIN_LOCATION_COOKIE, locationId, LOCATION_COOKIE_OPTIONS);

  return {
    locations: context.locations,
    activeLocation,
    selectedLocationId: locationId,
  };
}

export async function clearAdminLocationSelection() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_LOCATION_COOKIE);
}

export async function ensureDefaultAdminLocationSelection() {
  const context = await resolveAdminLocationContext();
  if (!context.activeLocation) {
    return context;
  }

  const cookieStore = await cookies();
  const selectedLocationId = cookieStore.get(ADMIN_LOCATION_COOKIE)?.value ?? null;
  if (selectedLocationId === context.activeLocation.id) {
    return context;
  }

  cookieStore.set(ADMIN_LOCATION_COOKIE, context.activeLocation.id, LOCATION_COOKIE_OPTIONS);
  return {
    ...context,
    selectedLocationId: context.activeLocation.id,
  };
}
