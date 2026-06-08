'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

import { getAdminServiceConfig } from '../lib/adminService';
import { ADMIN_ROLES, getCurrentAdminUser } from '../lib/adminAuth';
import {
  clearAdminLocationSelection,
  ensureDefaultAdminLocationSelection,
  resolveAdminLocationContext,
} from '../lib/adminLocationServer';
import { hasAdminCapability, type AdminCapability } from '../lib/adminPermissions';
import { fetchLotBuilderPersistedState, persistParkingLotLayout } from '../lib/parkingLotLayout';
import type { ParkingLotDefinition } from '../lib/parkingMap';
import { getAdminSupabaseConfig } from '../lib/supabase';

async function createAdminAuthClient() {
  const config = getAdminSupabaseConfig();

  if (!config?.url || !config.anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in admin environment variables.');
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

async function requireAdminCapability(capability: AdminCapability) {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    throw new Error('Unauthorized');
  }

  if (!hasAdminCapability(adminUser.role, capability)) {
    throw new Error('Insufficient permissions for this admin action.');
  }

  return adminUser;
}

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();

  if (!email || !password) {
    redirect('/login?error=Enter%20your%20email%20and%20password.');
  }

  const supabase = await createAdminAuthClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    await supabase.auth.signOut();
    redirect('/login?error=Unable%20to%20confirm%20your%20session.');
  }

  const { data: roleData, error: roleError } = await supabase
    .from('admin_user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent(roleError.message)}`);
  }

  const role = roleData?.role;

  if (!role || !ADMIN_ROLES.includes(role)) {
    await supabase.auth.signOut();
    redirect('/login?error=Access%20denied.%20This%20account%20is%20not%20allowed%20to%20use%20the%20admin%20dashboard.');
  }

  await ensureDefaultAdminLocationSelection();
  redirect('/');
}

export async function signOutAdmin() {
  const supabase = await createAdminAuthClient();
  await supabase.auth.signOut();
  await clearAdminLocationSelection();
  redirect('/login');
}

export async function runParkingReconciliation(formData: FormData) {
  await requireAdminCapability('run-reconciliation');
  const redirectTo = String(formData.get('redirectTo') ?? '/').trim() || '/';
  const config = getAdminServiceConfig();

  if (!config?.serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE URL in admin environment variables.');
  }

  const response = await fetch(`${config.url}/rest/v1/rpc/reconcile_parking_state`, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  revalidatePath('/');
  revalidatePath('/qr');
  redirect(redirectTo);
}

export async function updateSlotStatus(formData: FormData) {
  await requireAdminCapability('edit-slot-status');
  const slotId = String(formData.get('slotId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const redirectTo = String(formData.get('redirectTo') ?? '/').trim() || '/';

  if (!slotId || !status) {
    throw new Error('Missing slot id or status.');
  }

  const normalizedStatus = status === 'disputed' ? 'blocked' : status;

  if (!['available', 'reserved', 'occupied', 'blocked'].includes(normalizedStatus)) {
    throw new Error(`Unsupported slot status: ${status}`);
  }

  const config = getAdminServiceConfig();

  if (!config?.serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE URL in admin environment variables.');
  }

  const updateResponse = await fetch(
    `${config.url}/rest/v1/parking_slots?id=eq.${slotId}`,
    {
      method: 'PATCH',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ status: normalizedStatus }),
    },
  );

  if (!updateResponse.ok) {
    throw new Error(await updateResponse.text());
  }

  await fetch(`${config.url}/rest/v1/operator_events`, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      slot_id: slotId,
      event_type: 'slot_status_changed',
      payload: { status: normalizedStatus, previous_status: status },
    }),
  });

  revalidatePath('/');
  revalidatePath('/qr');
  redirect(redirectTo);
}

export async function resetParkingSlots(formData: FormData) {
  const adminUser = await requireAdminCapability('reset-slot-statuses');
  const redirectTo = String(formData.get('redirectTo') ?? '/').trim() || '/';
  const config = getAdminServiceConfig();

  if (!config?.serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE URL in admin environment variables.');
  }

  const serviceRoleKey = config.serviceRoleKey;

  const locationContext = await resolveAdminLocationContext();
  const activeLocation = locationContext.activeLocation;

  if (!activeLocation) {
    throw new Error('No active admin location found.');
  }

  const slotListResponse = await fetch(
    `${config.url}/rest/v1/parking_slots?select=id&location_id=eq.${activeLocation.id}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    },
  );

  if (!slotListResponse.ok) {
    throw new Error(await slotListResponse.text());
  }

  const slotRows = (await slotListResponse.json()) as Array<{ id: string }>;

  await Promise.all(
    slotRows.map(async (slot) => {
      const updateResponse = await fetch(
        `${config.url}/rest/v1/parking_slots?id=eq.${slot.id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({ status: 'available' }),
        },
      );

      if (!updateResponse.ok) {
        throw new Error(await updateResponse.text());
      }
    }),
  );

  await fetch(`${config.url}/rest/v1/operator_events`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      event_type: 'parking_slots_reset',
      payload: {
        status: 'available',
        slot_count: slotRows.length,
        location_id: activeLocation.id,
        location_name: activeLocation.name,
        actor_user_id: adminUser.id,
        actor_role: adminUser.role,
      },
    }),
  });

  revalidatePath('/');
  revalidatePath('/qr');
  redirect(redirectTo);
}

export async function resetDemoData(formData: FormData) {
  const adminUser = await requireAdminCapability('reset-demo-data');
  const redirectTo = String(formData.get('redirectTo') ?? '/').trim() || '/';
  const config = getAdminServiceConfig();

  if (!config?.serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE URL in admin environment variables.');
  }

  const authHeaders = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  const locationContext = await resolveAdminLocationContext();
  const activeLocation = locationContext.activeLocation;

  if (!activeLocation) {
    throw new Error('No active admin location found.');
  }

  const slotRowsResponse = await fetch(
    `${config.url}/rest/v1/parking_slots?select=id&location_id=eq.${activeLocation.id}`,
    {
      headers: authHeaders,
      cache: 'no-store',
    },
  );

  if (!slotRowsResponse.ok) {
    throw new Error(await slotRowsResponse.text());
  }

  const slotRows = (await slotRowsResponse.json()) as Array<{ id: string }>;
  const slotIds = slotRows.map((slot) => slot.id);

  const reservationResponse = await fetch(
    `${config.url}/rest/v1/reservations?select=id,slot_id`,
    { headers: authHeaders, cache: 'no-store' },
  );
  const sessionResponse = await fetch(
    `${config.url}/rest/v1/parking_sessions?select=id,reservation_id,slot_id`,
    { headers: authHeaders, cache: 'no-store' },
  );
  const paymentResponse = await fetch(
    `${config.url}/rest/v1/payments?select=id,reservation_id,session_id`,
    { headers: authHeaders, cache: 'no-store' },
  );
  const operatorEventResponse = await fetch(
    `${config.url}/rest/v1/operator_events?select=id,slot_id,reservation_id,session_id,payload`,
    { headers: authHeaders, cache: 'no-store' },
  );

  if (!reservationResponse.ok || !sessionResponse.ok || !paymentResponse.ok || !operatorEventResponse.ok) {
    throw new Error('Failed to load scoped admin reset data.');
  }

  const reservations = (await reservationResponse.json()) as Array<{ id: string; slot_id: string | null }>;
  const sessions = (await sessionResponse.json()) as Array<{ id: string; reservation_id: string | null; slot_id: string | null }>;
  const payments = (await paymentResponse.json()) as Array<{ id: string; reservation_id: string | null; session_id: string | null }>;
  const operatorEvents = (await operatorEventResponse.json()) as Array<{
    id: string;
    slot_id: string | null;
    reservation_id: string | null;
    session_id: string | null;
    payload: Record<string, unknown> | null;
  }>;

  const reservationIds = reservations.filter((reservation) => reservation.slot_id && slotIds.includes(reservation.slot_id)).map((reservation) => reservation.id);
  const sessionIds = sessions
    .filter((session) => (session.slot_id && slotIds.includes(session.slot_id)) || (session.reservation_id && reservationIds.includes(session.reservation_id)))
    .map((session) => session.id);
  const paymentIds = payments
    .filter((payment) => (payment.reservation_id && reservationIds.includes(payment.reservation_id)) || (payment.session_id && sessionIds.includes(payment.session_id)))
    .map((payment) => payment.id);
  const operatorEventIds = operatorEvents
    .filter((event) =>
      (event.slot_id && slotIds.includes(event.slot_id)) ||
      (event.reservation_id && reservationIds.includes(event.reservation_id)) ||
      (event.session_id && sessionIds.includes(event.session_id)) ||
      (typeof event.payload?.location_id === 'string' && event.payload.location_id === activeLocation.id),
    )
    .map((event) => event.id);

  const deleteRowsByIds = async (tableName: string, ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    const response = await fetch(`${config.url}/rest/v1/${tableName}?id=in.(${ids.join(',')})`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  };

  await deleteRowsByIds('operator_events', operatorEventIds);
  await deleteRowsByIds('payments', paymentIds);
  await deleteRowsByIds('parking_sessions', sessionIds);
  await deleteRowsByIds('reservations', reservationIds);

  const slotResetResponse = await fetch(
    `${config.url}/rest/v1/parking_slots?location_id=eq.${activeLocation.id}`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ status: 'available' }),
    },
  );

  if (!slotResetResponse.ok) {
    throw new Error(await slotResetResponse.text());
  }

  await fetch(`${config.url}/rest/v1/operator_events`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      event_type: 'demo_state_reset',
      payload: {
        status: 'available',
        location_id: activeLocation.id,
        location_name: activeLocation.name,
        tables_cleared: ['operator_events', 'payments', 'parking_sessions', 'reservations', 'parking_slots'],
        actor_user_id: adminUser.id,
        actor_role: adminUser.role,
      },
    }),
  });

  revalidatePath('/');
  revalidatePath('/qr');
  redirect(redirectTo);
}

export async function loadLotBuilderState() {
  const locationContext = await resolveAdminLocationContext();
  return fetchLotBuilderPersistedState(locationContext.activeLocation?.id ?? null);
}

export async function saveLotBuilderLayout(layoutJson: string) {
  await requireAdminCapability('edit-map-layout');
  const lot = JSON.parse(layoutJson) as ParkingLotDefinition;
  const locationContext = await resolveAdminLocationContext();
  const state = await fetchLotBuilderPersistedState(locationContext.activeLocation?.id ?? null);

  if (!state?.locationId) {
    throw new Error('No active parking location found. Seed Supabase locations first.');
  }

  await persistParkingLotLayout(lot, state.locationId, state.liveSlots);

  revalidatePath('/lot-builder');
  revalidatePath('/parking-map');

  return { ok: true as const, savedAt: new Date().toISOString() };
}
