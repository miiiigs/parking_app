import { cookies } from 'next/headers';

import type { AuthenticatedOperatorUser } from './operatorAuth';
import { getCurrentOperatorUser } from './operatorAuth';
import { listOperatorLocationAssignments } from './operatorLocationAccess';
import { getOperatorSupabaseConfig } from './supabase';
import {
  fetchOperatorLocations,
  getServiceHeaders,
  OPERATOR_LOCATION_COOKIE,
  pickOperatorLocation,
  type ActiveOperatorLocation,
} from './operatorLocation';

const LOCATION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

export type OperatorLocationContext = {
  locations: ActiveOperatorLocation[];
  activeLocation: ActiveOperatorLocation | null;
  selectedLocationId: string | null;
};

function emptyLocationContext(): OperatorLocationContext {
  return {
    locations: [],
    activeLocation: null,
    selectedLocationId: null,
  };
}

export async function resolveOperatorLocationContext(operatorUser?: AuthenticatedOperatorUser | null): Promise<OperatorLocationContext> {
  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return emptyLocationContext();
  }

  const currentUser = operatorUser ?? await getCurrentOperatorUser();
  if (!currentUser) {
    return emptyLocationContext();
  }

  const cookieStore = await cookies();
  const selectedLocationId = cookieStore.get(OPERATOR_LOCATION_COOKIE)?.value ?? null;
  const headers = getServiceHeaders(config.serviceRoleKey);
  const allLocations = await fetchOperatorLocations(config.url, headers);

  if (currentUser.role !== 'admin') {
    const assignments = await listOperatorLocationAssignments({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      userId: currentUser.id,
    });
    const assignedLocationIds = new Set(assignments.map((assignment) => assignment.location_id));
    const scopedLocations = allLocations.filter((location) => assignedLocationIds.has(location.id));
    const activeLocation = pickOperatorLocation(scopedLocations, selectedLocationId);

    return {
      locations: scopedLocations,
      activeLocation,
      selectedLocationId: activeLocation?.id ?? null,
    };
  }

  const activeLocation = pickOperatorLocation(allLocations, selectedLocationId);

  return {
    locations: allLocations,
    activeLocation,
    selectedLocationId: activeLocation?.id ?? null,
  };
}

export async function setOperatorLocationSelection(locationId: string) {
  const context = await resolveOperatorLocationContext();
  const cookieStore = await cookies();
  const activeLocation = context.locations.find((location) => location.id === locationId) ?? null;

  if (!activeLocation) {
    throw new Error('Unknown or inactive parking location.');
  }

  cookieStore.set(OPERATOR_LOCATION_COOKIE, locationId, LOCATION_COOKIE_OPTIONS);

  return {
    locations: context.locations,
    activeLocation,
    selectedLocationId: locationId,
  };
}

export async function clearOperatorLocationSelection() {
  const cookieStore = await cookies();
  cookieStore.delete(OPERATOR_LOCATION_COOKIE);
}

export async function ensureDefaultOperatorLocationSelection() {
  const context = await resolveOperatorLocationContext();
  if (!context.activeLocation) {
    return context;
  }

  const cookieStore = await cookies();
  const selectedLocationId = cookieStore.get(OPERATOR_LOCATION_COOKIE)?.value ?? null;
  if (selectedLocationId === context.activeLocation.id) {
    return context;
  }

  cookieStore.set(OPERATOR_LOCATION_COOKIE, context.activeLocation.id, LOCATION_COOKIE_OPTIONS);
  return {
    ...context,
    selectedLocationId: context.activeLocation.id,
  };
}
