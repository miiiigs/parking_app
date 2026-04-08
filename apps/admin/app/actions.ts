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
      body: JSON.stringify({ status }),
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
      payload: { status },
      payload: { status: normalizedStatus, previous_status: status },
    }),
  });

  revalidatePath('/');
  revalidatePath('/qr');
  redirect(redirectTo);
}