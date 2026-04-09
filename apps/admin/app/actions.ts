'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getAdminServiceConfig } from '../lib/adminService';

export async function updateSlotStatus(formData: FormData) {
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
  const redirectTo = String(formData.get('redirectTo') ?? '/').trim() || '/';
  const config = getAdminServiceConfig();

  if (!config?.serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE URL in admin environment variables.');
  }

  const slotListResponse = await fetch(
    `${config.url}/rest/v1/parking_slots?select=id`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
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
            apikey: config.serviceRoleKey,
            Authorization: `Bearer ${config.serviceRoleKey}`,
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
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      event_type: 'parking_slots_reset',
      payload: { status: 'available', slot_count: slotRows.length },
    }),
  });

  revalidatePath('/');
  revalidatePath('/qr');
  redirect(redirectTo);
}

export async function resetDemoData(formData: FormData) {
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

  const deleteAllRows = async (tableName: string) => {
    const response = await fetch(`${config.url}/rest/v1/${tableName}?id=not.is.null`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  };

  await deleteAllRows('operator_events');
  await deleteAllRows('payments');
  await deleteAllRows('parking_sessions');
  await deleteAllRows('reservations');

  const slotResetResponse = await fetch(
    `${config.url}/rest/v1/parking_slots?id=not.is.null`,
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
      payload: { status: 'available', tables_cleared: ['operator_events', 'payments', 'parking_sessions', 'reservations', 'parking_slots'] },
    }),
  });

  revalidatePath('/');
  revalidatePath('/qr');
  redirect(redirectTo);
}